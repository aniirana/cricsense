import cv2, csv
import mediapipe as mp
import numpy as np
from collections import deque
from analyzers.utils import (
    get_lm, calc_angle, draw_skeleton, draw_weight_bar,
    draw_panel, get_summary_and_alerts,
    BOWL_BENCHMARKS, CONF_VIS, TRAIL_LEN, mp_pose
)

def bowl_weight(lms,w,h):
    rx,_,rv=get_lm(lms,"RIGHT_HIP",w,h); lx,_,lv=get_lm(lms,"LEFT_HIP",w,h)
    rax,_,rav=get_lm(lms,"RIGHT_ANKLE",w,h); lax,_,lav=get_lm(lms,"LEFT_ANKLE",w,h)
    if all(v>CONF_VIS for v in [rv,lv,rav,lav]):
        off=(rx+lx)/2-(rax+lax)/2
        return ("RIGHT LEG",off) if off>25 else ("LEFT LEG",off) if off<-25 else ("BALANCED",off)
    return "UNKNOWN",0

def bowl_arm(lms,w,h):
    rs=get_lm(lms,"RIGHT_SHOULDER",w,h); re=get_lm(lms,"RIGHT_ELBOW",w,h); rw=get_lm(lms,"RIGHT_WRIST",w,h)
    ls=get_lm(lms,"LEFT_SHOULDER",w,h); le=get_lm(lms,"LEFT_ELBOW",w,h); lw=get_lm(lms,"LEFT_WRIST",w,h)
    r=calc_angle(rs[:2],re[:2],rw[:2]) if all(p[2]>CONF_VIS for p in [rs,re,rw]) else None
    l=calc_angle(ls[:2],le[:2],lw[:2]) if all(p[2]>CONF_VIS for p in [ls,le,lw]) else None
    return r,l

def bowl_hip_sho(lms,w,h):
    rx,ry,rv=get_lm(lms,"RIGHT_HIP",w,h); lx,ly,lv=get_lm(lms,"LEFT_HIP",w,h)
    rsx,rsy,rsv=get_lm(lms,"RIGHT_SHOULDER",w,h); lsx,lsy,lsv=get_lm(lms,"LEFT_SHOULDER",w,h)
    hip=round(np.degrees(np.arctan2(abs(ry-ly),abs(rx-lx)+1e-6)),1) if rv>CONF_VIS and lv>CONF_VIS else None
    sho=round(np.degrees(np.arctan2(abs(rsy-lsy),abs(rsx-lsx)+1e-6)),1) if rsv>CONF_VIS and lsv>CONF_VIS else None
    return hip,sho,round(abs(hip-sho),1) if hip and sho else None

def bowl_fknee(lms,w,h):
    lh=get_lm(lms,"LEFT_HIP",w,h); lk=get_lm(lms,"LEFT_KNEE",w,h); la=get_lm(lms,"LEFT_ANKLE",w,h)
    rh=get_lm(lms,"RIGHT_HIP",w,h); rk=get_lm(lms,"RIGHT_KNEE",w,h); ra=get_lm(lms,"RIGHT_ANKLE",w,h)
    return (calc_angle(lh[:2],lk[:2],la[:2]) if all(p[2]>CONF_VIS for p in [lh,lk,la]) else None,
            calc_angle(rh[:2],rk[:2],ra[:2]) if all(p[2]>CONF_VIS for p in [rh,rk,ra]) else None)

def bowl_trunk(lms,w,h):
    nose=get_lm(lms,"NOSE",w,h)
    lhx,lhy,lhv=get_lm(lms,"LEFT_HIP",w,h); rhx,rhy,rhv=get_lm(lms,"RIGHT_HIP",w,h)
    mx=(lhx+rhx)//2; my=(lhy+rhy)//2; mv=min(lhv,rhv)
    if nose[2]>CONF_VIS and mv>CONF_VIS:
        dx=nose[0]-mx; dy=my-nose[1]
        lean=round(np.degrees(np.arctan2(abs(dx),abs(dy)+1e-6)),1)
        return lean,"FORWARD" if dx>15 else "BACK" if dx<-15 else "UPRIGHT"
    return None,"UNKNOWN"

def analyze_bowling(inp, outp, csv_path):
    pose=mp_pose.Pose(static_image_mode=False,model_complexity=2,smooth_landmarks=True,
                      min_detection_confidence=.5,min_tracking_confidence=.5)
    cap=cv2.VideoCapture(inp)
    fps=cap.get(cv2.CAP_PROP_FPS) or 30
    w=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); h=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out=cv2.VideoWriter(outp,cv2.VideoWriter_fourcc(*'mp4v'),fps,(w,h))
    rows=[]; fn=0

    while cap.isOpened():
        ret,frame=cap.read()
        if not ret: break
        fn+=1
        rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB); res=pose.process(rgb)
        if res.pose_landmarks:
            lms=res.pose_landmarks.landmark
            draw_skeleton(frame,lms,w,h)
            ws,off=bowl_weight(lms,w,h); ra,la=bowl_arm(lms,w,h)
            ha,sa,sep=bowl_hip_sho(lms,w,h); fkl,fkr=bowl_fknee(lms,w,h); lean,ldir=bowl_trunk(lms,w,h)
            draw_weight_bar(frame,off,w,"WEIGHT (RUN-UP)")
            draw_panel(frame,[
                ("WEIGHT",ws,None),("ARM",f"R:{ra}°" if ra else "--","r_arm_angle"),
                ("SEPAR.",f"{sep}°" if sep else "--","hip_sho_separation"),
                ("FRT KNE",f"L:{fkl}°" if fkl else "--","front_knee_l"),
                ("TRUNK",f"{ldir}" if ldir else "--","trunk_lean"),
            ],h,"bowl",BOWL_BENCHMARKS)
            rows.append({"frame":fn,"time_s":round(fn/fps,3),"weight_side":ws,
                "hip_offset_px":round(off,2),"r_arm_angle":ra,"l_arm_angle":la,
                "hip_angle":ha,"shoulder_angle":sa,"hip_sho_separation":sep,
                "front_knee_l":fkl,"front_knee_r":fkr,"trunk_lean":lean,"trunk_direction":ldir})
        cv2.putText(frame,f"Frame {fn}",(w-100,h-8),cv2.FONT_HERSHEY_SIMPLEX,.4,(80,110,85),1)
        out.write(frame)

    cap.release(); out.release(); pose.close()

    if rows:
        with open(csv_path,"w",newline="") as f:
            writer=csv.DictWriter(f,fieldnames=rows[0].keys()); writer.writeheader(); writer.writerows(rows)

    summary, alerts, suggestions = get_summary_and_alerts(rows, BOWL_BENCHMARKS)
    return {"rows": rows, "summary": summary, "alerts": alerts, "suggestions": suggestions}

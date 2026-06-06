import cv2, csv
import mediapipe as mp
import numpy as np
from collections import deque
from analyzers.utils import (
    get_lm, calc_angle, draw_skeleton, draw_weight_bar,
    draw_panel, draw_com_trail, get_summary_and_alerts,
    BAT_BENCHMARKS, CONF_VIS, TRAIL_LEN, mp_pose
)

def bat_weight(lms,w,h):
    rx,_,rv=get_lm(lms,"RIGHT_HIP",w,h); lx,_,lv=get_lm(lms,"LEFT_HIP",w,h)
    rax,_,rav=get_lm(lms,"RIGHT_ANKLE",w,h); lax,_,lav=get_lm(lms,"LEFT_ANKLE",w,h)
    if all(v>CONF_VIS for v in [rv,lv,rav,lav]):
        off=(rx+lx)/2-(rax+lax)/2
        return ("RIGHT LEG",off) if off>25 else ("LEFT LEG",off) if off<-25 else ("BALANCED",off)
    return "UNKNOWN",0

def bat_knee(lms,side,w,h):
    hp=get_lm(lms,f"{side}_HIP",w,h); k=get_lm(lms,f"{side}_KNEE",w,h); a=get_lm(lms,f"{side}_ANKLE",w,h)
    return calc_angle(hp[:2],k[:2],a[:2]) if all(p[2]>CONF_VIS for p in [hp,k,a]) else None

def bat_hip_rot(lms,w,h):
    rx,ry,rv=get_lm(lms,"RIGHT_HIP",w,h); lx,ly,lv=get_lm(lms,"LEFT_HIP",w,h)
    return round(np.degrees(np.arctan2(abs(ry-ly),abs(rx-lx)+1e-6)),1) if rv>CONF_VIS and lv>CONF_VIS else None

def bat_com(lms,w,h):
    core=[("LEFT_SHOULDER",1.),("RIGHT_SHOULDER",1.),("LEFT_HIP",1.5),("RIGHT_HIP",1.5),("LEFT_KNEE",.8),("RIGHT_KNEE",.8)]
    xs=ys=tot=0
    for n,wt in core:
        x,y,v=get_lm(lms,n,w,h)
        if v>CONF_VIS: xs+=x*wt*v; ys+=y*wt*v; tot+=wt*v
    return (int(xs/tot),int(ys/tot)) if tot else None

def analyze_batting(inp, outp, csv_path):
    pose = mp_pose.Pose(static_image_mode=False,model_complexity=2,smooth_landmarks=True,
                        min_detection_confidence=.5,min_tracking_confidence=.5)
    cap  = cv2.VideoCapture(inp)
    fps  = cap.get(cv2.CAP_PROP_FPS) or 30
    w    = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h    = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out  = cv2.VideoWriter(outp,cv2.VideoWriter_fourcc(*'mp4v'),fps,(w,h))
    trail= deque(maxlen=TRAIL_LEN); rows=[]; fn=0

    while cap.isOpened():
        ret,frame=cap.read()
        if not ret: break
        fn+=1
        rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB); res=pose.process(rgb)
        if res.pose_landmarks:
            lms=res.pose_landmarks.landmark
            draw_skeleton(frame,lms,w,h)
            ws,off=bat_weight(lms,w,h); rk=bat_knee(lms,"RIGHT",w,h)
            lk=bat_knee(lms,"LEFT",w,h); hr=bat_hip_rot(lms,w,h); com=bat_com(lms,w,h)
            trail.append(com); draw_com_trail(frame,com,trail)
            draw_weight_bar(frame,off,w,"WEIGHT TRANSFER")
            draw_panel(frame,[
                ("WEIGHT",ws,None),("OFFSET",f"{off:+.0f}px","hip_offset_px"),
                ("R KNEE",f"{rk}°" if rk else "--","r_knee_angle"),
                ("L KNEE",f"{lk}°" if lk else "--","l_knee_angle"),
                ("HIP ROT",f"{hr}°" if hr else "--","hip_rotation"),
            ],h,"bat",BAT_BENCHMARKS)
            rows.append({"frame":fn,"time_s":round(fn/fps,3),"weight_side":ws,
                "hip_offset_px":round(off,2),"r_knee_angle":rk,"l_knee_angle":lk,"hip_rotation":hr})
        else: trail.append(None)
        cv2.putText(frame,f"Frame {fn}",(w-100,h-8),cv2.FONT_HERSHEY_SIMPLEX,.4,(80,110,85),1)
        out.write(frame)

    cap.release(); out.release(); pose.close()

    if rows:
        with open(csv_path,"w",newline="") as f:
            writer=csv.DictWriter(f,fieldnames=rows[0].keys()); writer.writeheader(); writer.writerows(rows)

    summary, alerts, suggestions = get_summary_and_alerts(rows, BAT_BENCHMARKS)
    return {"rows": rows, "summary": summary, "alerts": alerts, "suggestions": suggestions}

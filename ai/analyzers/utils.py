import cv2
import mediapipe as mp
import numpy as np
from collections import deque

mp_pose  = mp.solutions.pose
CONF_VIS = 0.4
TRAIL_LEN= 40

BAT_BENCHMARKS = {
    "r_knee_angle":  (120,160,15,"Right Knee Bend","°"),
    "l_knee_angle":  (120,160,15,"Left Knee Bend","°"),
    "hip_rotation":  (10,35,8,"Hip Rotation","°"),
    "hip_offset_px": (-40,40,20,"Hip Offset","px"),
}
BOWL_BENCHMARKS = {
    "r_arm_angle":        (140,180,15,"Bowling Arm Angle","°"),
    "hip_sho_separation": (15,45,8,"Hip-Sho Separation","°"),
    "front_knee_l":       (150,180,15,"Front Knee","°"),
    "trunk_lean":         (10,40,8,"Trunk Lean","°"),
}

def get_lm(lms, name, w, h):
    lm = lms[mp_pose.PoseLandmark[name].value]
    return int(lm.x*w), int(lm.y*h), lm.visibility

def calc_angle(a, b, c):
    v1 = np.array([a[0]-b[0], a[1]-b[1]], dtype=float)
    v2 = np.array([c[0]-b[0], c[1]-b[1]], dtype=float)
    cos_a = np.dot(v1,v2) / (np.linalg.norm(v1)*np.linalg.norm(v2)+1e-6)
    return round(np.degrees(np.arccos(np.clip(cos_a,-1,1))), 1)

def bench_status(val, b):
    if val is None: return "ok"
    lo, hi, buf = b[0], b[1], b[2]
    if lo <= val <= hi: return "ok"
    if (lo-buf) <= val <= (hi+buf): return "warn"
    return "bad"

def bench_cv_color(val, b):
    s = bench_status(val, b)
    return {"ok":(34,197,94),"warn":(99,165,249),"bad":(68,68,239)}[s]

SKEL = [
    ("LEFT_SHOULDER","RIGHT_SHOULDER",(200,200,50)),
    ("LEFT_SHOULDER","LEFT_ELBOW",(255,140,0)),
    ("LEFT_ELBOW","LEFT_WRIST",(255,200,0)),
    ("RIGHT_SHOULDER","RIGHT_ELBOW",(0,140,255)),
    ("RIGHT_ELBOW","RIGHT_WRIST",(0,200,255)),
    ("LEFT_SHOULDER","LEFT_HIP",(180,255,100)),
    ("RIGHT_SHOULDER","RIGHT_HIP",(100,255,180)),
    ("LEFT_HIP","RIGHT_HIP",(200,200,50)),
    ("LEFT_HIP","LEFT_KNEE",(255,80,80)),
    ("LEFT_KNEE","LEFT_ANKLE",(255,140,140)),
    ("RIGHT_HIP","RIGHT_KNEE",(80,80,255)),
    ("RIGHT_KNEE","RIGHT_ANKLE",(140,140,255)),
]

def draw_skeleton(frame, lms, w, h):
    for p1,p2,color in SKEL:
        try:
            x1,y1,c1 = get_lm(lms,p1,w,h); x2,y2,c2 = get_lm(lms,p2,w,h)
            if c1>.3 and c2>.3: cv2.line(frame,(x1,y1),(x2,y2),color,2)
        except: pass
    for name in ["LEFT_SHOULDER","RIGHT_SHOULDER","LEFT_ELBOW","RIGHT_ELBOW",
                 "LEFT_WRIST","RIGHT_WRIST","LEFT_HIP","RIGHT_HIP",
                 "LEFT_KNEE","RIGHT_KNEE","LEFT_ANKLE","RIGHT_ANKLE"]:
        try:
            x,y,cf = get_lm(lms,name,w,h)
            if cf>.3:
                cv2.circle(frame,(x,y),5,(0,255,255),-1)
                cv2.circle(frame,(x,y),5,(0,0,0),1)
        except: pass

def draw_weight_bar(frame, offset, w, label="WEIGHT TRANSFER"):
    bw,bh = 600,44; bx = w//2-bw//2; by = 10
    cv2.rectangle(frame,(bx-2,by-2),(bx+bw+2,by+bh+2),(0,0,0),-1)
    cv2.rectangle(frame,(bx,by),(bx+bw,by+bh),(60,60,60),-1)
    cx = bx+bw//2; cv2.line(frame,(cx,by),(cx,by+bh),(180,180,180),1)
    fill = int(np.clip(offset/80,-1,1)*(bw//2))
    if fill>0:   cv2.rectangle(frame,(cx,by+2),(cx+fill,by+bh-2),(0,100,255),-1)
    elif fill<0: cv2.rectangle(frame,(cx+fill,by+2),(cx,by+bh-2),(255,120,0),-1)
    cv2.putText(frame,"L",(bx-24,by+30),cv2.FONT_HERSHEY_SIMPLEX,1.0,(255,120,0),2)
    cv2.putText(frame,"R",(bx+bw+4,by+30),cv2.FONT_HERSHEY_SIMPLEX,1.0,(0,100,255),2)
    cv2.putText(frame,label,(bx+bw//2-80,by-6),cv2.FONT_HERSHEY_SIMPLEX,0.7,(180,180,180),2)

def draw_panel(frame, items, h, mode, bench_map):
    px,py = 10, h-280
    cv2.rectangle(frame,(px-4,py-28),(px+380,py+len(items)*48+4),(0,0,0),-1)
    cv2.rectangle(frame,(px-4,py-28),(px+380,py+len(items)*48+4),(40,60,44),1)
    color = (34,197,94) if mode=="bat" else (99,165,249)
    cv2.putText(frame,"BATTING" if mode=="bat" else "BOWLING",(px,py-6),cv2.FONT_HERSHEY_SIMPLEX,0.8,color,2)
    for i,(lb,val,mkey) in enumerate(items):
        v = str(val)
        if "RIGHT" in v: vc=(0,140,255)
        elif "LEFT" in v: vc=(255,140,0)
        elif any(x in v for x in ["BALANCED","UPRIGHT"]): vc=(34,197,94)
        elif "FORWARD" in v: vc=(0,255,180)
        elif "BACK" in v: vc=(255,80,80)
        else: vc=(220,220,220)
        if mkey and mkey in bench_map:
            try:
                nv = float(str(val).replace("°","").replace("px",""))
                vc = bench_cv_color(nv, bench_map[mkey])
            except: pass
        cv2.putText(frame,f"{lb}:",(px,py+i*48),cv2.FONT_HERSHEY_SIMPLEX,0.85,(100,130,105),2)
        cv2.putText(frame,v,(px+160,py+i*48),cv2.FONT_HERSHEY_SIMPLEX,0.9,vc,2)

def draw_com_trail(frame, com, trail):
    t = list(trail)
    for i in range(1,len(t)):
        if t[i-1] and t[i]:
            a = i/len(t)
            cv2.line(frame,t[i-1],t[i],(int(50*a),int(220*a),int(100*a)),max(1,int(a*3)))
    if com:
        cv2.circle(frame,com,8,(34,197,94),-1)
        cv2.circle(frame,com,8,(255,255,255),2)

def get_summary_and_alerts(rows, bench_map):
    import pandas as pd
    if not rows: return {}, [], ["No pose landmarks were detected. Try a clearer side-on video with the full body in frame."]
    df = pd.DataFrame(rows)
    summary = {}
    alerts  = []
    suggestions = []
    for col,(lo,hi,buf,label,unit) in bench_map.items():
        if col not in df.columns: continue
        avg = df[col].dropna().mean()
        if pd.isna(avg): continue
        avg = round(avg,1)
        summary[label] = f"{avg}{unit}"
        s = bench_status(avg,(lo,hi,buf))
        if s in ("warn", "bad"):
            direction = "increase" if avg < lo else "reduce"
            suggestions.append(f"{label}: {direction} toward the {lo}-{hi}{unit} ideal range.")
        if s == "bad":
            alerts.append(f"{label}: {avg}{unit} (ideal {lo}–{hi}{unit})")
    if "weight_side" in df:
        n = len(df)
        summary["Right Leg %"] = f"{round(len(df[df.weight_side=='RIGHT LEG'])/n*100,1)}%"
        summary["Left Leg %"]  = f"{round(len(df[df.weight_side=='LEFT LEG'])/n*100,1)}%"
        summary["Balanced %"]  = f"{round(len(df[df.weight_side=='BALANCED'])/n*100,1)}%"
        balanced = len(df[df.weight_side=='BALANCED'])/n*100
        if balanced < 35:
            suggestions.append("Balance: spend more of the motion in a stable base before release or contact.")
    return summary, alerts, suggestions

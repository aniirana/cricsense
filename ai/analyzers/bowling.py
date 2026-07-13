def analyze_bowling(inp, outp, csv_path):

    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    cap = cv2.VideoCapture(inp)

    fps = cap.get(cv2.CAP_PROP_FPS) or 30

    OUTPUT_WIDTH = 640
    OUTPUT_HEIGHT = 480

    out = cv2.VideoWriter(
        outp,
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (OUTPUT_WIDTH, OUTPUT_HEIGHT),
    )

    rows = []
    fn = 0

    while cap.isOpened():

        ret, frame = cap.read()

        if not ret:
            break

        # Resize frame to reduce memory usage
        frame = cv2.resize(frame, (OUTPUT_WIDTH, OUTPUT_HEIGHT))

        h, w = frame.shape[:2]

        fn += 1

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)

        if res.pose_landmarks:

            lms = res.pose_landmarks.landmark

            draw_skeleton(frame, lms, w, h)

            ws, off = bowl_weight(lms, w, h)
            ra, la = bowl_arm(lms, w, h)
            ha, sa, sep = bowl_hip_sho(lms, w, h)
            fkl, fkr = bowl_fknee(lms, w, h)
            lean, ldir = bowl_trunk(lms, w, h)

            draw_weight_bar(frame, off, w, "WEIGHT (RUN-UP)")

            draw_panel(
                frame,
                [
                    ("WEIGHT", ws, None),
                    ("ARM", f"R:{ra}°" if ra else "--", "r_arm_angle"),
                    ("SEPAR.", f"{sep}°" if sep else "--", "hip_sho_separation"),
                    ("FRT KNE", f"L:{fkl}°" if fkl else "--", "front_knee_l"),
                    ("TRUNK", ldir, "trunk_lean"),
                ],
                h,
                "bowl",
                BOWL_BENCHMARKS,
            )

            rows.append(
                {
                    "frame": fn,
                    "time_s": round(fn / fps, 3),
                    "weight_side": ws,
                    "hip_offset_px": round(off, 2),
                    "r_arm_angle": ra,
                    "l_arm_angle": la,
                    "hip_angle": ha,
                    "shoulder_angle": sa,
                    "hip_sho_separation": sep,
                    "front_knee_l": fkl,
                    "front_knee_r": fkr,
                    "trunk_lean": lean,
                    "trunk_direction": ldir,
                }
            )

        cv2.putText(
            frame,
            f"Frame {fn}",
            (w - 100, h - 8),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.4,
            (80, 110, 85),
            1,
        )

        out.write(frame)

    cap.release()
    out.release()
    pose.close()
    cv2.destroyAllWindows()

    import gc

    del cap
    del out
    del pose

    gc.collect()

    if rows:
        with open(csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)

    summary, alerts, suggestions = get_summary_and_alerts(rows, BOWL_BENCHMARKS)

    return {
        "rows": rows,
        "summary": summary,
        "alerts": alerts,
        "suggestions": suggestions,
    }
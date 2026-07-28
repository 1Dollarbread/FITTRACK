import { ExerciseFormInfo, ExerciseMedia } from "./types";

const image = (exerciseId: string, alt: string): ExerciseMedia => ({
  type: "image",
  src: `/exercise-media/${exerciseId}/${exerciseId}.jpg`,
  alt,
  caption: "Form reference photo",
});

const info = (
  exerciseId: string,
  alt: string,
  instructions: string,
  details: string[]
): ExerciseFormInfo => ({
  media: image(exerciseId, alt),
  instructions,
  details,
});

export const EXERCISE_FORM_INFO: Record<string, ExerciseFormInfo> = {
  back_squat: info(
    "back_squat",
    "Back Squat form photo",
    "Stand with feet shoulder-width apart, keep your chest tall, and sit back into your hips. Push through your heels and keep your knees tracking your toes.",
    [
      "Drive through the mid-foot and heels.",
      "Keep a neutral spine and avoid rounding your lower back.",
      "Pause briefly at parallel and finish each rep with full hip extension.",
    ]
  ),
  goblet_squat: info(
    "goblet_squat",
    "Goblet Squat form photo",
    "Hold the weight close to your chest, keep your elbows between your knees, and squat down with a straight back. Use your legs to power back up.",
    [
      "Keep your chest upright and core braced.",
      "Sit your hips back and down rather than leaning forward.",
      "Keep your weight on your heels and mid-foot.",
    ]
  ),
  bodyweight_squat: info(
    "bodyweight_squat",
    "Bodyweight Squat form photo",
    "Stand with feet shoulder-width apart, push your hips back, and lower until your thighs are at least parallel. Keep your spine neutral and drive up through your heels.",
    [
      "Keep your knees aligned with your toes.",
      "Avoid collapsing your chest forward.",
      "Use controlled tempo to maintain good form.",
    ]
  ),
  leg_press: info(
    "leg_press",
    "Leg Press form photo",
    "Place your feet hip-width on the platform, lower until your knees are at about 90 degrees, then press back up without locking your knees.",
    [
      "Keep your lower back pressed to the seat.",
      "Do not let your knees collapse inward.",
      "Control the movement on both the descent and ascent.",
    ]
  ),
  band_squat: info(
    "band_squat",
    "Band Resisted Squat form photo",
    "Step on a band and hold the handles at chest height. Squat with a tall torso, keeping the band under tension throughout the set.",
    [
      "Maintain tension on the band the entire time.",
      "Keep your knees tracking your toes.",
      "Drive through your heels as you stand.",
    ]
  ),
  deadlift: info(
    "deadlift",
    "Barbell Deadlift form photo",
    "Stand with feet under the bar, hinge at the hips, and keep the bar close to your legs. Pull with a flat back, then lock your hips and shoulders at the top.",
    [
      "Keep your back neutral and chest up.",
      "Start the lift from a strong hip hinge, not from your lower back.",
      "Finish with your shoulders over your hips.",
    ]
  ),
  dumbbell_rdl: info(
    "dumbbell_rdl",
    "Dumbbell RDL form photo",
    "Hold dumbbells by your sides, hinge from the hips, and lower until you feel a stretch in your hamstrings. Keep your spine flat and shoulders back.",
    [
      "Lead with your hips, not your chest.",
      "Keep a slight bend in the knees.",
      "Pause briefly at the bottom for a stronger stretch.",
    ]
  ),
  band_good_morning: info(
    "band_good_morning",
    "Band Good Morning form photo",
    "Place the band across your upper back, hinge from the hips, and keep a neutral spine as you lower your torso. Drive your hips forward to return.",
    [
      "Keep your back flat throughout the movement.",
      "Avoid bending your knees too much.",
      "Move slowly to protect your lower back.",
    ]
  ),
  bodyweight_good_morning: info(
    "bodyweight_good_morning",
    "Bodyweight Good Morning form photo",
    "Keep a soft bend in your knees, hinge from the hips, and lower your torso until you feel tension in your hamstrings. Return by driving your hips forward.",
    [
      "Keep your core braced and spine neutral.",
      "Use a controlled descent.",
      "Focus on the hip hinge rather than bending at the waist.",
    ]
  ),
  bench_press: info(
    "bench_press",
    "Barbell Bench Press form photo",
    "Lie flat on the bench, plant your feet, and lower the bar to your chest with elbows at about 45 degrees. Press up explosively while keeping your shoulders stable.",
    [
      "Keep your shoulder blades squeezed together.",
      "Touch the bar to your mid-chest.",
      "Drive through your feet and maintain a solid base.",
    ]
  ),
  dumbbell_press: info(
    "dumbbell_press",
    "Dumbbell Bench Press form photo",
    "Press dumbbells from chest level with wrists stacked over elbows. Keep your shoulders down and drive the weights up in a controlled arc.",
    [
      "Use equal range of motion on both arms.",
      "Keep your elbows under the dumbbells.",
      "Avoid letting the weights drift too far back over your shoulders.",
    ]
  ),
  pushup: info(
    "pushup",
    "Push-Up form photo",
    "Keep a straight line from head to heels, lower your chest to the floor, and press back up without letting your hips sag.",
    [
      "Engage your core and glutes.",
      "Keep elbows at about 45 degrees to your body.",
      "Maintain a neutral neck position.",
    ]
  ),
  band_press: info(
    "band_press",
    "Band Chest Press form photo",
    "Anchor the band behind you, press forward with your hands at chest height, and keep your shoulder blades stable.",
    [
      "Keep resistance on the band throughout the movement.",
      "Avoid shrugging your shoulders.",
      "Control the return phase.",
    ]
  ),
  overhead_press: info(
    "overhead_press",
    "Overhead Press form photo",
    "Press the barbell or dumbbells overhead in a straight line, keeping your core tight and ribs down. Lock out at the top without overarching your lower back.",
    [
      "Keep your wrists stacked over your elbows.",
      "Avoid excessive lumbar extension.",
      "Drive through your mid-foot for a stable base.",
    ]
  ),
  band_overhead_press: info(
    "band_overhead_press",
    "Band Overhead Press form photo",
    "Stand on the band and press it overhead, keeping your core braced and elbows under your wrists.",
    [
      "Keep tension on the band at the top.",
      "Avoid flaring your ribs or arching your lower back.",
      "Press smoothly through the full range.",
    ]
  ),
  pullup: info(
    "pullup",
    "Pull-Up form photo",
    "Hang from the bar with a shoulder-width grip, pull your chest toward the bar, then lower with control.",
    [
      "Keep your shoulders down and back.",
      "Avoid swinging or kipping.",
      "Pull until your chin clears the bar.",
    ]
  ),
  lat_pulldown: info(
    "lat_pulldown",
    "Lat Pulldown form photo",
    "Sit tall, grip the bar, and pull it to your upper chest while keeping your elbows pointed down.",
    [
      "Lean back slightly from the hips.",
      "Avoid pulling the bar behind your neck.",
      "Focus on squeezing your lats at the bottom.",
    ]
  ),
  band_pulldown: info(
    "band_pulldown",
    "Band Pulldown form photo",
    "Anchor the band overhead, pull down to your upper chest, and keep your elbows driving down.",
    [
      "Stay upright and keep your shoulders packed.",
      "Control the band on the return.",
      "Visualize the lats doing the work.",
    ]
  ),
  barbell_row: info(
    "barbell_row",
    "Barbell Row form photo",
    "Hinge from the hips, keep your back flat, and pull the bar toward your lower ribs. Lower with control.",
    [
      "Keep your torso stable and avoid bouncing.",
      "Drive your elbows back, not out.",
      "Maintain a neutral neck position.",
    ]
  ),
  dumbbell_row: info(
    "dumbbell_row",
    "Dumbbell Row form photo",
    "Support one hand on a bench, keep your back flat, and row the dumbbell to your hip.",
    [
      "Keep your shoulder blade pulled back.",
      "Avoid rotating your torso.",
      "Pull through your elbow, not your hand.",
    ]
  ),
  band_row: info(
    "band_row",
    "Band Row form photo",
    "Anchor the band in front of you, sit or stand tall, and row the handles into your ribs while keeping your core braced.",
    [
      "Keep the band under tension during the whole set.",
      "Pull your elbows back through your sides.",
      "Avoid shrugging your shoulders.",
    ]
  ),
  bodyweight_row: info(
    "bodyweight_row",
    "Table/Bar Inverted Row form photo",
    "Keep a straight body line, pull your chest up to the bar or tabletop, and lower slowly.",
    [
      "Keep your hips level with your shoulders.",
      "Drive your elbows back and down.",
      "Avoid letting your lower back sag.",
    ]
  ),
  straight_arm_pulldown: info(
    "straight_arm_pulldown",
    "Straight-Arm Pulldown form photo",
    "Keep arms mostly straight, hinge from the hips, and pull the band or cable down to your thighs with your lats.",
    [
      "Keep your core tight and spine neutral.",
      "Feel the movement in your lats, not your arms.",
      "Avoid bending your elbows too much.",
    ]
  ),
  dumbbell_pullover: info(
    "dumbbell_pullover",
    "Dumbbell Pullover form photo",
    "Lie on a bench, hold the dumbbell with both hands, and lower it behind your head while keeping a slight bend in the elbows.",
    [
      "Keep your core engaged and ribs down.",
      "Move with control through the shoulder joint.",
      "Use a moderate weight that allows full range of motion.",
    ]
  ),
  band_pullover: info(
    "band_pullover",
    "Band Pullover form photo",
    "Anchor a band overhead, keep your arms long, and pull it down in a smooth arc toward your hips.",
    [
      "Keep tension on the band the entire time.",
      "Move from the lats rather than the arms.",
      "Avoid shrugging your shoulders.",
    ]
  ),
  dumbbell_shrug: info(
    "dumbbell_shrug",
    "Dumbbell Shrug form photo",
    "Hold dumbbells at your sides, shrug your shoulders straight up, and lower them under control.",
    [
      "Keep your arms straight and relaxed.",
      "Avoid rolling your shoulders.",
      "Pause briefly at the top for a stronger contraction.",
    ]
  ),
  barbell_shrug: info(
    "barbell_shrug",
    "Barbell Shrug form photo",
    "Grab the bar with a shoulder-width grip, shrug the shoulders up, and lower under control.",
    [
      "Keep your back straight and chest tall.",
      "Do not use momentum to lift the weight.",
      "Squeeze at the top of each rep.",
    ]
  ),
  band_shrug: info(
    "band_shrug",
    "Band Shrug form photo",
    "Stand on the band and shrug your shoulders up, keeping your arms straight and the band taut.",
    [
      "Keep your neck relaxed.",
      "Control the lowering phase.",
      "Use a weight that lets you feel the trap contraction.",
    ]
  ),
  face_pull: info(
    "face_pull",
    "Cable/Band Face Pull form photo",
    "Pull the rope or band toward your face with elbows high and shoulders back. Keep your wrists straight.",
    [
      "Lead with your elbows, not your hands.",
      "Squeeze your upper back with each rep.",
      "Avoid shrugging your shoulders.",
    ]
  ),
  prone_y_raise: info(
    "prone_y_raise",
    "Prone Y Raise form photo",
    "Lie face down and raise your arms overhead in a Y shape while keeping your thumbs up and shoulder blades squeezed.",
    [
      "Keep your neck neutral and gaze down.",
      "Move slowly and avoid swinging.",
      "Focus on the rear shoulder and upper back.",
    ]
  ),
  hanging_leg_raise: info(
    "hanging_leg_raise",
    "Hanging Leg Raise form photo",
    "Hang from a bar, keep your legs straight or slightly bent, and lift them until they are parallel to the ground.",
    [
      "Keep your torso stable and avoid swinging.",
      "Lead with your hips, not your shoulders.",
      "Control the descent back down.",
    ]
  ),
  plank: info(
    "plank",
    "Plank form photo",
    "Hold a straight line from head to heels, keep your core tight, and avoid letting your hips sag or rise.",
    [
      "Breathe steadily throughout the hold.",
      "Keep your shoulders over your elbows.",
      "Squeeze your glutes and quads to stay stable.",
    ]
  ),
  bicycle_crunch: info(
    "bicycle_crunch",
    "Bicycle Crunch form photo",
    "Lie on your back, alternate bringing opposite elbow to opposite knee, and keep your lower back pressed to the floor.",
    [
      "Move with control, not speed.",
      "Keep your core engaged.",
      "Avoid pulling on your neck.",
    ]
  ),
  situp: info(
    "situp",
    "Sit-Up form photo",
    "Lie with knees bent, curl your upper body toward your knees, and lower back down with control.",
    [
      "Keep your chin tucked slightly.",
      "Avoid using momentum to sit up.",
      "Use your abs to control both directions.",
    ]
  ),
  pallof_press: info(
    "pallof_press",
    "Band Pallof Press form photo",
    "Stand sideways to the band, press it straight out in front of your chest, and resist rotation with your core.",
    [
      "Keep your ribs down and spine neutral.",
      "Stand tall and avoid leaning away from the band.",
      "Maintain tension on the band during the full rep.",
    ]
  ),
  farmers_carry: info(
    "farmers_carry",
    "Farmer's Carry form photo",
    "Hold heavy weights in both hands, stand tall, and walk with controlled steps while keeping your shoulders down.",
    [
      "Keep your core braced.",
      "Avoid leaning to one side.",
      "Take short, steady steps.",
    ]
  ),
  brisk_walk: info(
    "brisk_walk",
    "Brisk Walk form photo",
    "Walk at a quick pace with tall posture, long strides, and an engaged core.",
    [
      "Keep your shoulders relaxed.",
      "Swing your arms naturally.",
      "Land softly on your feet.",
    ]
  ),
  dumbbell_curl: info(
    "dumbbell_curl",
    "Dumbbell Curl form photo",
    "Keep your elbows pinned to your sides and curl the dumbbells with control. Lower slowly to maintain tension.",
    [
      "Avoid swinging your torso.",
      "Keep your wrists neutral.",
      "Feel the contraction in your biceps.",
    ]
  ),
  band_curl: info(
    "band_curl",
    "Band Curl form photo",
    "Stand on the band and curl it up with controlled motion. Keep your elbows fixed and avoid leaning back.",
    [
      "Keep tension on the band at the top.",
      "Control the eccentric portion.",
      "Avoid letting your shoulders shrug.",
    ]
  ),
  chinup: info(
    "chinup",
    "Chin-Up form photo",
    "Use a close grip, pull yourself up until your chin clears the bar, and lower with control." ,
    [
      "Keep your chest up and shoulders back.",
      "Avoid swinging your legs.",
      "Use full range of motion.",
    ]
  ),
  triceps_pushdown: info(
    "triceps_pushdown",
    "Triceps Pushdown form photo",
    "Keep your elbows locked at your sides and extend your arms downward until your triceps are fully contracted.",
    [
      "Keep your upper arms still.",
      "Avoid using your shoulders to push.",
      "Squeeze at the bottom of each rep.",
    ]
  ),
  overhead_extension: info(
    "overhead_extension",
    "Overhead Dumbbell Extension form photo",
    "Keep your elbows pointing forward, lower the dumbbell behind your head, and extend your arms overhead while bracing your core.",
    [
      "Avoid flaring your elbows too wide.",
      "Move slowly to protect your elbows.",
      "Keep your torso stable.",
    ]
  ),
  band_pushdown: info(
    "band_pushdown",
    "Band Triceps Pushdown form photo",
    "Anchor the band overhead, keep your elbows tucked, and press down until your arms are straight.",
    [
      "Maintain tension on the band.",
      "Keep your upper arms still.",
      "Control the return phase.",
    ]
  ),
  diamond_pushup: info(
    "diamond_pushup",
    "Diamond Push-Up form photo",
    "Place your hands close together in a diamond shape, keep your elbows close to your body, and lower your chest with control.",
    [
      "Keep your body in a straight line.",
      "Use your triceps to press up.",
      "Avoid letting your hips sag.",
    ]
  ),
  lateral_raise: info(
    "lateral_raise",
    "Dumbbell Lateral Raise form photo",
    "Raise the dumbbells out to the sides to shoulder height with a slight bend in the elbows. Keep the motion controlled.",
    [
      "Avoid swinging the weights.",
      "Keep your shoulders down.",
      "Lead with your elbows.",
    ]
  ),
  band_lateral_raise: info(
    "band_lateral_raise",
    "Band Lateral Raise form photo",
    "Stand on the band and raise your arms out to the sides, keeping tension on the band from start to finish.",
    [
      "Move with a controlled tempo.",
      "Keep your shoulders relaxed.",
      "Stop at shoulder height.",
    ]
  ),
  hip_thrust: info(
    "hip_thrust",
    "Barbell Hip Thrust form photo",
    "Drive your hips upward with your feet planted, squeeze your glutes at the top, and keep your chin tucked.",
    [
      "Push through your heels.",
      "Keep your spine neutral at the top.",
      "Avoid overextending your lower back.",
    ]
  ),
  dumbbell_hip_thrust: info(
    "dumbbell_hip_thrust",
    "Dumbbell Hip Thrust form photo",
    "Hold a dumbbell or weight across your hips, drive upward through your heels, and squeeze your glutes at the top.",
    [
      "Keep your feet flat and knees stacked over ankles.",
      "Hold the weight steady against your hips.",
      "Stop just short of locking out your hips.",
    ]
  ),
  glute_bridge: info(
    "glute_bridge",
    "Glute Bridge form photo",
    "Lie on your back with knees bent, push through your heels, and lift your hips until your body forms a straight line.",
    [
      "Squeeze your glutes at the top.",
      "Avoid arching your lower back.",
      "Keep your chin tucked slightly.",
    ]
  ),
  band_hip_thrust: info(
    "band_hip_thrust",
    "Band Hip Thrust form photo",
    "Place a band across your hips, press your hips upward, and keep tension on the band throughout the lift.",
    [
      "Keep your feet planted and knees stable.",
      "Hold the band steady.",
      "Focus on glute contraction.",
    ]
  ),
  leg_curl: info(
    "leg_curl",
    "Leg Curl Machine form photo",
    "Position yourself on the machine, curl your heels toward your glutes, and squeeze your hamstrings at the top.",
    [
      "Keep your hips pressed into the pad.",
      "Avoid lifting your torso.",
      "Slow the eccentric return.",
    ]
  ),
  band_leg_curl: info(
    "band_leg_curl",
    "Band Leg Curl form photo",
    "Anchor the band and curl your heel toward your glute, keeping your hips steady and your core engaged.",
    [
      "Keep your torso stable.",
      "Avoid jerking the band.",
      "Focus on the hamstring squeeze.",
    ]
  ),
  nordic_curl_negative: info(
    "nordic_curl_negative",
    "Nordic Curl Negative form photo",
    "Anchor your feet, lower slowly from the knees, and use your hamstrings to resist the descent as much as possible.",
    [
      "Control the negative with your hamstrings.",
      "Keep your body straight from knees to head.",
      "Use your hands to catch yourself if needed.",
    ]
  ),
  standing_calf_raise: info(
    "standing_calf_raise",
    "Standing Calf Raise form photo",
    "Stand tall on a raised surface, lower your heels deeply, and raise up onto your toes with full control.",
    [
      "Keep your knees slightly bent.",
      "Pause at the top for a stronger contraction.",
      "Avoid bouncing.",
    ]
  ),
  band_calf_raise: info(
    "band_calf_raise",
    "Band Calf Raise form photo",
    "Stand on the band, push through your toes, and raise your heels while keeping the band under tension.",
    [
      "Keep your core engaged.",
      "Lower your heels slowly.",
      "Avoid using momentum.",
    ]
  ),
  wrist_curl: info(
    "wrist_curl",
    "Dumbbell Wrist Curl form photo",
    "Rest your forearms on a bench, curl your wrists upward, then lower slowly to full stretch.",
    [
      "Move only at the wrist joint.",
      "Keep your forearms steady.",
      "Use a controlled tempo.",
    ]
  ),
  dead_hang: info(
    "dead_hang",
    "Dead Hang form photo",
    "Hang from a bar with straight arms, keep your shoulders engaged, and breathe steadily while maintaining a strong grip.",
    [
      "Keep your chest open.",
      "Avoid shrugging your shoulders.",
      "Relax your lower body.",
    ]
  ),
};

export function getExerciseFormInfo(exerciseId: string): ExerciseFormInfo | undefined {
  return EXERCISE_FORM_INFO[exerciseId];
}

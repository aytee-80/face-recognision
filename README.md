# face-recognision

React app that uses your webcam to recognise your facial expression in real time
(neutral, happy, sad, angry, fearful, disgusted, surprised).

Runs fully in the browser with [`@vladmandic/face-api`](https://github.com/vladmandic/face-api)
(TinyFaceDetector + FaceExpressionNet, TensorFlow.js). Model weights are bundled in
`public/models`, and no video leaves your device.

## Run

```bash
npm install
npm run dev     # open the URL shown, click "Start camera", allow access
npm run build   # production build in dist/
```

The camera requires `localhost` or HTTPS.

# TILT KART — Online multiplayer (no local installs)

## Publish once with GitHub + Render

1. Sign in to GitHub.com, create a new **public or private repository**.
2. Select **Add file → Upload files** and upload the contents of this folder, keeping the `public` folder structure. GitHub web upload may require uploading the `public` folder separately or using a browser that supports folder drag-and-drop.
3. Sign in to render.com with GitHub, choose **New → Web Service**, and connect that repository.
4. Set **Language** to Node, **Build Command** to `npm install`, **Start Command** to `npm start`, and choose a suitable instance plan. Click Deploy. (The included `render.yaml` also describes these settings.)
5. When deployment finishes, open your `https://...onrender.com` URL on the laptop. The screen shows the correct phone address and room code.
6. Players open the shown address on phones and enter the room code. No download, local terminal, or shared Wi-Fi required.

## Notes
- You only need to deploy once. Hosting is a third-party service and may have fees, limits, or cold-start delays depending on its current plan.
- A single deployed instance runs one shared lobby; this is not yet a production multi-room service.
- Host controls are not password protected, so keep the host page link private.
- Tilt motion permission may need to be explicitly enabled on phones. Touch steering works as fallback. HTTPS from hosting allows motion APIs to work on supported devices.
- Internet access is required for host and players.

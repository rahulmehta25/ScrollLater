# ScrollLater audio pipeline worker

Watches `audio_jobs` where `status='queued'`, renders narration via ElevenLabs,
uploads the MP3 to GCS (`gs://scrolllater-audio-us-east1`), and updates the row
to `status='ready'` with `audio_gs_url`.

## Local

```bash
export DATABASE_URL=postgresql://postgres:...@127.0.0.1:5432/scrolllater
export ELEVENLABS_API_KEY=...
export GCS_AUDIO_BUCKET=scrolllater-audio-us-east1

# Start Cloud SQL proxy in another terminal:
../../scripts/db-proxy.sh

# Run the worker (continuous loop):
python main.py

# Or drain once and exit (what Cloud Scheduler calls):
WORKER_MODE=once python main.py
```

## Deploy to Cloud Run Jobs

```bash
gcloud builds submit --tag us-east1-docker.pkg.dev/osmoti-auth/scrolllater/audio-worker
gcloud run jobs create scrolllater-audio-worker \
  --image us-east1-docker.pkg.dev/osmoti-auth/scrolllater/audio-worker \
  --region us-east1 \
  --set-secrets ELEVENLABS_API_KEY=elevenlabs-api-key:latest,DATABASE_URL=scrolllater-database-url:latest \
  --set-env-vars WORKER_MODE=once,GCS_AUDIO_BUCKET=scrolllater-audio-us-east1 \
  --service-account scrolllater-audio@osmoti-auth.iam.gserviceaccount.com

gcloud scheduler jobs create http scrolllater-audio-tick \
  --schedule "*/5 * * * *" \
  --location us-east1 \
  --uri https://us-east1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/osmoti-auth/jobs/scrolllater-audio-worker:run \
  --http-method POST \
  --oauth-service-account-email scrolllater-audio@osmoti-auth.iam.gserviceaccount.com
```

The scheduler hits the Cloud Run Job every 5 minutes; each run drains up to
`MAX_JOBS_PER_RUN` queued jobs and exits.

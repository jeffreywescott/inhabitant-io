# inhabitant-io - local US activism for cities

This was designed to run on [Google Cloud Functions][google-cloud-functions]. You should familiarize yourself with that environment before continuing, as you'll need to use the [Local Emulator][google-cloud-functions-emulator] to run things locally.

## Local Usage

```bash
yarn install
functions kill
functions start
functions deploy district --trigger-http
curl -s "http://localhost:8010/paidfor/us-central1/district?address=1637+Stuart+St+Berkeley+CA+94703"
curl -s "http://localhost:8010/paidfor/us-central1/district?lng=-122.27536&lat=37.8501"
```

## Notes

This currently depends on the [US Census Bureau's Geocoder API][us-census-geocoder].

<!-- links -->

[google-cloud-functions]: https://cloud.google.com/functions/docs/
[google-cloud-functions-emulator]: https://github.com/GoogleCloudPlatform/cloud-functions-emulator/
[us-census-geocoder]: https://geocoding.geo.census.gov/geocoder/
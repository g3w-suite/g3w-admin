---
marp: false
---

# Openrouteservice G3W Suite plugin

## Requirements

See: `requirements.txt` and `requirements_testing.txt` for running the test suite.

## Settings

| Name                       | Meaning                       | Default      |
|----------------------------|-------------------------------|--------------|
| ORS_MAX_LOCATIONS          | Max number of locations (it depends on the server configuration)      | 2           |
| ORS_MAX_RANGES          | Max number of ranges (it depends on the server configuration)      | 6           |
| ORS_ENDPOINT               | URL of the service            | http://localhost:8080/ors/v2 (for testing)|
| ORS_API_KEY                | API Key of the service        | None         |
| ORS_PROFILES               | Dictionary of available profiles  | None         |



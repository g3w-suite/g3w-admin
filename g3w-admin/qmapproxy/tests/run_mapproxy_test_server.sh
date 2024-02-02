#!/bin/bash

gunicorn -b localhost:8080  -w 4 run_mapproxy:application
#!/bin/bash

declare -A repo

repo["frontend"]="g3w-admin-frontend.git"
repo["editing"]="g3w-admin-editing.git"
repo["caching"]="g3w-admin-caching.git"
repo["ogc"]="g3w-admin-ogc.git"
repo["notes"]="g3w-admin-notes.git"
repo["cdu"]="g3w-admin-cdu.git"
repo["law"]="g3w-admin-law.git"
repo["cadastre"]="g3w-admin-cadastre.git"
repo["iternet"]="g3w-admin-iternet.git"

for key in ${!repo[@]}; do
    git submodule add -f https://wlorenzetti:kotegaeshi7890@bitbucket.org/gis3w/${repo[${key}]} g3w-admin/${key}
    if [ -e g3w-admin/${key}/packages.txt ]
    then
        cat g3w-admin/${key}/packages.txt | xargs apt-get install -y
    fi
    if [ -e g3w-admin/${key}/requirements.txt ]
    then
        pip install g3w-admin/${key}/requirements.txt
    fi
done

# packege to installa for modules



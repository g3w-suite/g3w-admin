#!/bin/bash

echo "Installing Suite ..."

pwd
ls -lah

curl -sL https://deb.nodesource.com/setup_11.x | bash -
wget https://nightly.yarnpkg.com/debian/pool/main/y/yarn/yarn_1.9.0-20180719.1538_all.deb
apt install -y ./yarn_1.9.0-20180719.1538_all.deb


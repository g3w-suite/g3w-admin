FROM g3wsuite/g3w-suite-local-development:20.04

RUN apt-get update && apt install -y \
    git \
    openssh-client

RUN mkdir -p /root/.ssh/
COPY id_rsa /root/.ssh/
RUN chmod 700 /root/.ssh/id_rsa
RUN ssh-keyscan bitbucket.org > /root/.ssh/known_hosts

# g3w-admin-law
RUN cd / && git clone git@bitbucket.org:gis3w/g3w-admin-law.git

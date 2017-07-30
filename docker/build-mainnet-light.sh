#! /bin/sh

# Build the docker image for a geth light node.

DOCKERDIR=geth-light
cp geth-init.sh ${DOCKERDIR}/
cp geth.sh ${DOCKERDIR}/ 

. build.sh

rm ${DOCKERDIR}/geth-init.sh
rm ${DOCKERDIR}/geth.sh

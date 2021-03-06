#! /bin/sh

# Build a geth rinkeby light node

DOCKERDIR=geth-rinkeby-light

cp rinkeby-init.sh ${DOCKERDIR}/
cp rinkeby.sh ${DOCKERDIR}/ 
cp rinkeby.json ${DOCKERDIR}/ 

. build.sh

rm ${DOCKERDIR}/rinkeby-init.sh
rm ${DOCKERDIR}/rinkeby.sh
rm ${DOCKERDIR}/rinkeby.json

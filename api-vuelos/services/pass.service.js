'use strict'
const bcrypt=require("bcrypt");

function encriptar(contraseña){
    return bcrypt.hash(contraseña,10);
}
function comparar(contraseña, hash){
    return bcrypt.compare(contraseña,hash);
}

module.exports={
    encriptar,comparar
}
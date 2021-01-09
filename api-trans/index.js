'use strict'
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

/**
 * transacciones
 * modulo trnsaccional
 * 
 * falta implmetar saga en las cancelaciones y guardado de las reservas en la BD
 */
const port = process.env.PORT || 3200
const https =require('https');
const fs =require('fs');
const express = require('express');
const logger = require('morgan');
const mongojs = require('mongojs');
const fetch = require('node-fetch');
const opciones={
    key:fs.readFileSync('./cert/key.pem'),
    cert:fs.readFileSync('./cert/cert.pem')
};

const tokenService=require('./services/token.service');
const { version } = require('moment');


function auth(req, res, next) {
    if (!req.headers.authorization){ //Mirar si en la cabecera hay un token.
        res.status(403).json({
            result: 'KO',
            mensajes: "No has enviado el token en la cabecera."
        });
        return next();
    }

    console.log(req.headers.authorization);
    if(tokenService.decodificaToken(req.headers.authorization.split(" ")[1])) { // token en formato JWT
        return next();
    }

    res.status(403).json({
        result: 'KO',
        mensajes: "Acceso no autorizado a este servicio."
    });
    return next(new Error("Acceso no autorizado a este servicio."));
    
}


const app = express();

var db = mongojs("mongodb+srv://fran:fqOZ39V1T0kItdyz@cluster0.biqs9.mongodb.net/vuelos?retryWrites=true&w=majority"); // Enlazamos con la DB "Atlas"
var id = mongojs.ObjectID; // Función para convertir un id textual en un objectID


// middlewares
app.use(logger('dev')); // probar con: tiny, short, dev, common, combined
app.use(express.urlencoded({extended: false})) // parse application/x-www-form-urlencoded
app.use(express.json()) // parse application/json


// routes


/**
 * realiza una reserva
 * campos:
 * email
 * idHotel
 * idVuelo
 * idVehiculo
 */
app.post('/reservar', auth,async (req, res, next) => {//creacion de la reserva
    let elementoId = req.params.id;
    let elementoNuevo = req.body;
    const queToken=req.headers.authorization.split(" ")[1];
    const usuario=req.body.email;
    const idHotel=req.body.idHotel
    const idVuelo=req.body.idVuelo;
    const idVehiculo=req.body.idVehiculo;

    var Pago;
    var Hotel="";
    var Vuelo="";
    var Vehiculo="";
    var conexionFallida=false;
    var reservaFallida=false;
    
    if(usuario!=""){//si poseo el usuario

        Pago=await fetch(`https://localhost:3040/pago`,{//obtengo la respuesta del banco
                method: 'GET',
                headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                    Pago = Object.assign({}, json);
                    return Pago;
                });
        console.log(Pago);
        if(Pago.pago=='true'){
                
            if(idHotel!=""){//si tengo id de hotel, lo reservo

                Hotel=await fetch(`https://localhost:3001/api/reserva/${idHotel}`,{
                    method: 'PUT',
                    body: JSON.stringify(req.body), 
                    headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                        Hotel = Object.assign({}, json);
                        return Hotel;
                    }).catch(function(err){
                        conexionFallida=true;
                        return err;
                    });
                    //si ha habido un error coloco las variables de error a true
                if(conexionFallida){
                    Hotel="conexion fallida al hotel";
                    Vuelo="Reserva cancelada correctamente";
                    Vehiculo="Reserva cancelada correctamente";
                }else if(Hotel.mensaje=="El hotel no esta disponible"){
                    reservaFallida=true;
                    Hotel=Hotel.mensaje;
                    Vuelo="Reserva cancelada correctamente";
                    Vehiculo="Reserva cancelada correctamente";
                }
                    
            }
            if(idVuelo!=""&&!conexionFallida&&!reservaFallida){//si tengo un vuelo y no hay error en hotel reservo

                Vuelo=await fetch(`https://localhost:3000/api/reserva/${idVuelo}`,{
                    method: 'PUT',
                    body: JSON.stringify(req.body), 
                    headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                        Vuelo = Object.assign({}, json);
                        return Vuelo;
                    }).catch(function(err){
                        conexionFallida=true;
                        return err;
                    });
                    //si ha habido un error colocos las variables de error a true y aborto la reserva de hotel
                    if(conexionFallida){
                        if(idHotel!=""){
                        Vuelo="conexion fallida al vuelo";
                        await fetch(`https://localhost:3001/api/reserva/${idHotel}`,{
                        method: 'DELETE',
                        body: JSON.stringify(req.body), 
                        headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                        }); 

                        Hotel="Reserva cancelada correctamente";
                        Vehiculo="Reserva cancelada correctamente";
                    }

                    }else if(Vuelo.mensaje=="El vuelo no esta disponible"){
                        reservaFallida=true;
                        Vuelo=Vuelo.mensaje;
                        if(idHotel!=""){
                        await fetch(`https://localhost:3001/api/reserva/${idHotel}`,{
                        method: 'DELETE',
                        body: JSON.stringify(req.body), 
                        headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                        }); 
                        Hotel="Reserva cancelada correctamente";
                        Vehiculo="Reserva cancelada correctamente";
                        }
                    }

                    
            }
            if(idVehiculo!=""&&!conexionFallida&&!reservaFallida){//si tengo un vehiculo y no hay error en hotel ni vuelo reservo

                Vehiculo=await fetch(`https://localhost:3002/api/reserva/${idVehiculo}`,{
                    method: 'PUT',
                    body: JSON.stringify(req.body), 
                    headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                        Vehiculo = Object.assign({}, json);
                        return Vehiculo;
                    }).catch(function(err){
                        conexionFallida=true;
                        return err;
                    });
                    //si ha habido un error colocos las variables de error a true y aborto la reserva de hotel y vuelo
                    if(conexionFallida){
                        Vehiculo="conexion fallida al vuelo";
                        if(idHotel!=""){
                        await fetch(`https://localhost:3001/api/reserva/${idHotel}`,{
                            method: 'DELETE',
                            body: JSON.stringify(req.body), 
                            headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                            }); 
                            Hotel="Reserva cancelada correctamente";
                        }
                        if(idVuelo!=""){
                        await fetch(`https://localhost:3000/api/reserva/${idVuelo}`,{
                            method: 'DELETE',
                            body: JSON.stringify(req.body), 
                            headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {

                            }); 
                            Vuelo="Reserva cancelada correctamente";
                        }
                            
                            


                    }else if(Vehiculo.mensaje=="El vehiculo no esta disponible"){
                        reservaFallida=true;
                        Vehiculo=Vehiculo.mensaje;
                        if(idHotel!=""){
                        await fetch(`https://localhost:3001/api/reserva/${idHotel}`,{
                            method: 'DELETE',
                            body: JSON.stringify(req.body), 
                            headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                            });
                            Hotel="Reserva cancelada correctamente";
                        }
                        if(idVuelo!=""){
                        await fetch(`https://localhost:3000/api/reserva/${idVuelo}`,{
                            method: 'DELETE',
                            body: JSON.stringify(req.body), 
                            headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                            }); 
                            Vuelo="Reserva cancelada correctamente";
                        }
                            
                            
                    }
                    
            }
            
            res.json({
                Usuario:usuario,
                Vuelo:Vuelo,
                Hotel:Hotel,
                Vehiculo:Vehiculo
            });
            
           
        }else{
            res.json({
                Pago:"ERROR al pagar, reserva cancelada"
            });

        }
    }
});
/**
 * cancela una reserva
 * campos:
 * email
 * idHotel
 * idVuelo
 * idVehiculo
 * 
 * falta impletemtar patron saga
 */
app.delete('/cancelar',auth, async (req, res, next) => {//cancela reservas
    let elementoId = req.params.id;
    let elementoNuevo = req.body;
    const queToken=req.headers.authorization.split(" ")[1];
    console.log("\n"+queToken+"\n");
    const usuario=req.body.email;
    const idHotel=req.body.idHotel
    const idVuelo=req.body.idVuelo;
    const idVehiculo=req.body.idVehiculo;
    
    var Pago;
    var Hotel="";
    var Vuelo="";
    var Vehiculo="";
    var conexionFallida=false;
    var cancelacionFallida=false;
    
    if(usuario!=""){//si poseo el usuario
        Pago=await fetch(`https://localhost:3040/pago`,{//obtengo la respuesta del banco
                method: 'GET',
                headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                    Pago = Object.assign({}, json);
                    return Pago;
                });
        if(Pago.pago=='true'){
            if(idHotel!=""){

                await fetch(`https://localhost:3001/api/reserva/${idHotel}`,{//si tengo un hotel cancelo
                    method: 'DELETE',
                    body: JSON.stringify(req.body), 
                    headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                        Hotel = Object.assign({}, json);
                        return Hotel;
                    }).catch(function(err){
                        conexionFallida=true;
                        return err;
                    });
                    if(conexionFallida){
                        Hotel="conexion fallida al hotel";
                        Vuelo="Cancelacion cancelada correctamente";
                        Vehiculo="Cancelacion cancelada correctamente";
                    }else if(Hotel.mensaje=="El hotel no estaba reservado previamente"){
                        cancelacionFallida=true;
                        Hotel=Hotel.mensaje;
                        Vuelo="Cancelacion cancelada correctamente";
                        Vehiculo="Cancelacion cancelada correctamente";
                    }
            }
            
            if(idVuelo!=""){

                await fetch(`https://localhost:3000/api/reserva/${idVuelo}`,{//si tengo un vuelo cancelo
                    method: 'DELETE',
                    body: JSON.stringify(req.body), 
                    headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                        Vuelo = Object.assign({}, json);
                        return Vuelo;
                    }).catch(function(err){
                        conexionFallida=true;
                        return err;
                    });
                    //si ha habido un error colocos las variables de error a true y aborto la cancelacion de hotel
                    if(conexionFallida){
                        Vuelo="conexion fallida al vuelo";
                        if(idHotel!=""){
                        await fetch(`https://localhost:3001/api/reserva/${idHotel}`,{
                        method: 'PUT',
                        body: JSON.stringify(req.body), 
                        headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                        }); 

                        Hotel="Cancelacion cancelada correctamente";
                        Vehiculo="Cancelacion cancelada correctamente";
                    }

                    }else if(Vuelo.mensaje=="El vuelo no estaba reservado previamente"){
                        reservaFallida=true;
                        Vuelo=Vuelo.mensaje;
                        if(idHotel!=""){
                        await fetch(`https://localhost:3001/api/reserva/${idHotel}`,{
                        method: 'PUT',
                        body: JSON.stringify(req.body), 
                        headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                        }); 
                        Hotel="Cancelacion cancelada correctamente";
                        Vehiculo="Cancelacion cancelada correctamente";
                    }
                    } 

            }
            
            if(idVehiculo!=""){//si tengo un vehiculo cancelo

                await fetch(`https://localhost:3002/api/reserva/${idVehiculo}`,{
                    method: 'DELETE',
                    body: JSON.stringify(req.body), 
                    headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                        Vehiculo = Object.assign({}, json);
                        return Vehiculo;
                    }).catch(function(err){
                        conexionFallida=true;
                        return err;
                    });
                    //si ha habido un error colocos las variables de error a true y aborto la cancelacion de hotel y vuelo
                    if(conexionFallida){
                        Vehiculo="conexion fallida al vuelo";
                        if(idHotel!=""){
                        await fetch(`https://localhost:3001/api/reserva/${idHotel}`,{
                            method: 'PUT',
                            body: JSON.stringify(req.body), 
                            headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                            }); 
                            Hotel="Cancelacion cancelada correctamente";
                        }
                        if(idVuelo!=""){
                        await fetch(`https://localhost:3000/api/reserva/${idVuelo}`,{
                            method: 'PUT',
                            body: JSON.stringify(req.body), 
                            headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {

                            }); 
                            Vuelo="Cancelacion cancelada correctamente";
                        }
                            
                            


                    }else if(Vehiculo.mensaje=="El vehiculo no esta disponible"){
                        reservaFallida=true;
                        Vehiculo=Vehiculo.mensaje;
                        if(idHotel!=""){
                        await fetch(`https://localhost:3001/api/reserva/${idHotel}`,{
                            method: 'PUT',
                            body: JSON.stringify(req.body), 
                            headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                            });
                            Hotel="Cancelacion cancelada correctamente";
                        }
                        if(idVuelo!=""){
                        await fetch(`https://localhost:3000/api/reserva/${idVuelo}`,{
                            method: 'PUT',
                            body: JSON.stringify(req.body), 
                            headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
                            }); 
                            Vuelo="Cancelacion cancelada correctamente";
                        }
                            
                            
                    }
            }
            res.json({
                Usuario:usuario,
                Vuelo:Vuelo,
                Hotel:Hotel,
                Vehiculo:Vehiculo
            });
        }else{
            res.json({
                Pago:"ERROR al rembolsar, cancelacion cancelada"
            });

        }
    }
});

// Iniciamos la aplicación
https.createServer(opciones,app).listen(port,()=>{
    console.log(`API trans ejecutándose en https://localhost:${port}`);
}); 












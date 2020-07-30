import React, { useRef, useEffect, useState } from "react";

import * as THREE from "three";

import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";


import WoodTexture from "./images/woodTexture.jpg";
import { Object3D } from "three";


let PalletModel = process.env.PUBLIC_URL + "/models/Pallet.glb";


function PalletRender() {

    let MountElement = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let width = (MountElement.current as HTMLDivElement).clientWidth;
        let height = (MountElement.current as HTMLDivElement).clientHeight;


        let scene = new THREE.Scene();
        let renderer = new THREE.WebGLRenderer({ antialias: true });

        let cameraFar = 3;

        let camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
        camera.position.z = 0;
        camera.position.y = cameraFar;

        //        camera.rotateX(Math.PI / 4);
        //        camera.position.x = cameraFar;
        // camera.position.y = 0;
        camera.lookAt(0, 0, 0);
        scene.background = new THREE.Color(0xf1f1f1);

        scene.fog = new THREE.Fog(0xf1f1f1, 20, 100);

        var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

        var dirLight = new THREE.DirectionalLight(0xffffff, 0.54);
        dirLight.position.set(-8, 12, 8);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
        // Add directional Light to scene    
        scene.add(dirLight);

        var axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);


        let model: THREE.Group;

        let animate = () => {
            renderer.render(scene, camera);
            /*             requestAnimationFrame(animate); */
        };

        let color = {
            texture: WoodTexture,
            size: [2, 2, 2],
            shininess: 0
        };


        let handleResize = () => {
            if (MountElement.current) {
                let mount = MountElement.current as HTMLDivElement;
                //let w = window.innerWidth * window.devicePixelRatio;
                // let h = window.innerHeight * window.devicePixelRatio;

                width = mount.clientWidth;
                height = mount.clientHeight;

                renderer.setSize(width, height);
                camera.aspect = width / height;
                //renderer.setSize(w, h, false);
                // camera.aspect = w / h;
                camera.updateProjectionMatrix();
                animate();
            }
        };


        let txt_lodaer = new THREE.TextureLoader();

        txt_lodaer.load(color.texture, (txt: THREE.Texture) => {
            txt.repeat.set(color.size[0], color.size[1]);

            txt.wrapS = THREE.RepeatWrapping;
            txt.wrapT = THREE.RepeatWrapping;

            txt.rotation = Math.PI / 2;

            let new_mtl = new THREE.MeshPhongMaterial({
                map: txt,
                shininess: color.shininess ? color.shininess : 10
            });

            let loader = new GLTFLoader();

            loader.load(PalletModel, (gltf: GLTF) => {
                model = gltf.scene;
                model.scale.set(2, 2, 2);
                model.position.y = -1;
                model.rotateY(Math.PI / 2);

                model.traverse((o: Object3D) => {
                    if (o instanceof THREE.Mesh) {
                        (o as THREE.Mesh).material = new_mtl;
                    }
                });
                scene.add(model);
                //            animate();
                handleResize();
            }, undefined, (error: ErrorEvent) => {
                console.log(error);
            });
        });

        //        render_scene();
        (MountElement.current as HTMLDivElement).appendChild(renderer.domElement);
        // window.addEventListener('resize', handleResize);

        animate();

    }, []);

    return (
        <div className="PalletMount" ref={MountElement} />
    );
};


export default PalletRender;

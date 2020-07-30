import React, { useRef, useEffect, useState } from "react";

import * as THREE from "three";

import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";

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

        let loader = new GLTFLoader();

        let model: THREE.Group;

        let animate = () => {
            renderer.render(scene, camera);
            /*             requestAnimationFrame(animate); */
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

        loader.load(PalletModel, (gltf: GLTF) => {
            model = gltf.scene;
            model.scale.set(2, 2, 2);
            model.position.y = -1;
            model.rotateY(Math.PI / 2);
            scene.add(model);
            //            animate();
            handleResize();
        }, undefined, (error: ErrorEvent) => {
            console.log(error);
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

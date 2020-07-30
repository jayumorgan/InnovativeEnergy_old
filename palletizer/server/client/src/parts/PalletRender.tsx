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

        let cameraFar = 5;

        let camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
        camera.position.z = cameraFar;
        camera.position.x = 0;

        scene.background = new THREE.Color(0xf1f1f1);

        scene.fog = new THREE.Fog(0xf1f1f1, 20, 100);

        let loader = new GLTFLoader();

        let model: THREE.Group;

        let render_scene = () => {
            renderer.render(scene, camera);
        };

        loader.load(PalletModel, (gltf: GLTF) => {
            model = gltf.scene;
            model.scale.set(2, 2, 2);
            model.position.y = -1;
            scene.add(model);
            render_scene();
        }, undefined, (error: ErrorEvent) => {
            console.log(error);
        });


        let handleResize = () => {
            if (MountElement.current) {
                width = (MountElement.current as HTMLDivElement).clientWidth;
                height = (MountElement.current as HTMLDivElement).clientHeight;
                renderer.setSize(width, height);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                render_scene();
            }
        };
        //        render_scene();
        (MountElement.current as HTMLDivElement).appendChild(renderer.domElement);
        window.addEventListener('resize', handleResize);

    }, []);

    return (
        <div className="PalletMount" ref={MountElement} />
    );
};




export default PalletRender;

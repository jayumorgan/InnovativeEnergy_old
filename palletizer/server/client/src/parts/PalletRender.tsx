import React, { useRef, useEffect, useState } from "react";

import * as Three from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";



let PalletModel = process.env.PUBLIC_URL + "/models/Pallet.glb";

function PalletRender() {

    let MountElement = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let width = (MountElement.current as HTMLDivElement).clientWidth;
        let height = (MountElement.current as HTMLDivElement).clientHeight;


        let scene = new Three.Scene();
        let renderer = new Three.WebGLRenderer({ antialias: true });

        let cameraFar = 5;

        let camera = new Three.PerspectiveCamera(45, width / height, 1, 1000);
        camera.position.z = cameraFar;
        camera.position.x = 0;

        scene.background = new Three.Color(0xf1f1f1);

        scene.fog = new Three.Fog(0xf1f1f1, 20, 100);


        let loader = new GLTFloader();


    }, []);

    return (
        <div className="BoxMount" ref={MountElement} />
    );
};

export default PalletRender;

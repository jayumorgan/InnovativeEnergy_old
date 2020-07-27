

import React, { useRef, useEffect } from "react";


import * as Three from "three";

function Box() {

    let MountElement = useRef<HTMLDivElement>(null);


    useEffect(() => {

        let width = (MountElement.current as HTMLDivElement).clientWidth;
        let height = (MountElement.current as HTMLDivElement).clientHeight;

        let renderer = new Three.WebGLRenderer({ antialias: true });
        renderer.setClearColor('white');
        renderer.setSize(width, height);

        let scene = new Three.Scene();
        scene = new Three.Scene();
        scene.background = new Three.Color(0xa0a0a0);
        scene.fog = new Three.Fog(0xa0a0a0, 1, 4);

        let hemiLight = new Three.HemisphereLight(0xffffff, 0x444444);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        let dirLight = new Three.DirectionalLight(0xffffff);
        dirLight.position.set(0, 1, 1);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 10;
        dirLight.shadow.camera.bottom = - 10;
        dirLight.shadow.camera.left = - 10;
        dirLight.shadow.camera.right = 10;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 40;
        scene.add(dirLight);

        // ground
        var groundMesh = new Three.Mesh(
            new Three.PlaneBufferGeometry(40, 40),
            new Three.MeshPhongMaterial({
                color: 0x999999,
                depthWrite: false
            })
        );

        groundMesh.rotation.x = - Math.PI / 2;
        groundMesh.receiveShadow = true;
        scene.add(groundMesh);

        let camera = new Three.PerspectiveCamera(45, width / height, 1, 1000);
        camera.position.set(0, 1.2, 1.2);
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    });

    return (
        <div className="BoxMount" ref={MountElement} />
    );
};


export default Box;

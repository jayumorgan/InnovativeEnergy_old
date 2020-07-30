import React, { useRef, useEffect, useState } from "react";

import * as Three from "three";


import { get_cardboard_box } from "./Visualizer";
import { MeshDepthMaterial, MeshBasicMaterialParameters } from "three";


//import wood from "./images/wood.jpg";
//import carboard from "./images/cardboard.jpg";
//import vcardboard from "./images/vcardboard.jpg";

export interface BoxDimensions {
    length: number;
    height: number;
    width: number;
};


interface Animation {
    scene: Three.Scene;
    render: () => void;
}

// attach a function reference
function Box({ length, height, width }: BoxDimensions) {

    let norm = Math.sqrt(length ** 2 + height ** 2 + width ** 2);
    let l = length / norm;
    let h = height / norm;
    let w = width / norm;
    console.log("Updating 3d component", l, h, w);

    let MountElement = useRef<HTMLDivElement>(null);
    //    let BoxMesh: Three.Mesh;
    let [Scene, SetScene] = useState<Animation | null>(null);
    useEffect(() => {
        let width = (MountElement.current as HTMLDivElement).clientWidth;
        let height = (MountElement.current as HTMLDivElement).clientHeight;

        let renderer = new Three.WebGLRenderer({ antialias: true });
        renderer.setClearColor('white');
        renderer.setSize(width, height);

        let scene = new Three.Scene();
        scene = new Three.Scene();
        scene.background = new Three.Color(0xa0a0a0);
        scene.fog = new Three.Fog(0xa0a0a0, 1, 10);

        let hemiLight = new Three.HemisphereLight(0xffffff, 0x444444);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        let dirLight = new Three.DirectionalLight(0xffffff);
        dirLight.position.set(2, 2, 1);
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
        groundMesh.position.set(0, -1, 0);
        scene.add(groundMesh);

        let camera = new Three.PerspectiveCamera(45, width / height, 1, 1000);
        camera.position.set(1.5, 0.5, 0.75);
        camera.lookAt(0, 0, 0);



        let render_scene = () => {
            renderer.render(scene, camera);
        };

        //let box = get_cardboard_box(0.5, 0.75, 0.5);
        let geometry = new Three.BoxGeometry(l, w, h);
        let material = new Three.MeshPhongMaterial({ color: "#DC9F61" });
        let box = new Three.Mesh(geometry, material);
        box.name = "BoxMesh";

        scene.add(box);

        render_scene();
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

        SetScene({ scene, render: render_scene } as Animation);
    }, []);

    useEffect(() => {
        let s = Scene;
        console.log("SCEEE", s);
        if (s) {
            console.log("In!");
            let bmesh = s.getObjectByName("BoxMesh");
            if (bmesh) {
                console.log("Alter Scale");
                bmesh.scale.set(l, w, h);
            }
        }
    }, [l, h, w]);
    return (
        <div className="BoxMount" ref={MountElement} />
    );
};


export default Box;

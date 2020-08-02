import React, { useRef, useEffect, useState } from "react";

import * as Three from "three";


import { get_cardboard_box } from "../../Visualizer";
import { MeshDepthMaterial, MeshBasicMaterialParameters } from "three";

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

    // Compute vector norm and divide by 4 (so that resulting dimensions are multiplied by sqrt(3)) -- for scaline
    let norm = Math.sqrt(length ** 2 + height ** 2 + width ** 2) / Math.sqrt(3);

    let l = length / norm;
    let h = height / norm;
    let w = width / norm;

    let MountElement = useRef<HTMLDivElement>(null);

    let [animation, setAnimation] = useState<Animation | null>(null);

    useEffect(() => {
        let width = (MountElement.current as HTMLDivElement).clientWidth;
        let height = (MountElement.current as HTMLDivElement).clientHeight;

        let renderer = new Three.WebGLRenderer({ antialias: true });
        renderer.setClearColor('white');
        renderer.setSize(width, height);

        let scene = new Three.Scene();
        scene = new Three.Scene();
        scene.background = new Three.Color(0xfbfbfb);
//        scene.fog = new Three.Fog(0xa0a0a0, 1, 10);

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
                color: 0xfbfbfb,
                depthWrite: false
            })
        );

        groundMesh.rotation.x = - Math.PI / 2;
        groundMesh.receiveShadow = true;
        groundMesh.position.set(0, -1, 0);
        scene.add(groundMesh);

        let camera = new Three.PerspectiveCamera(45, width / height, 1, 1000);
        camera.position.set(1.5, 1, 1.5);
        camera.lookAt(0, 0, 0);

        let render_scene = () => {
            renderer.render(scene, camera);
        };

        let geometry = new Three.BoxGeometry(1, 1, 1);
        let material = new Three.MeshPhongMaterial({ color: "#DC9F61" });
        let box = new Three.Mesh(geometry, material);
        box.name = "BoxMesh";

	box.scale.set(l,h,w);

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

        setAnimation({ scene, render: render_scene } as Animation);
    }, []);

    useEffect(() => {
        if (animation && animation.scene) {
            let s = animation.scene;
            let box_mesh = s.getObjectByName("BoxMesh") as Three.Mesh;
            box_mesh && console.log("BM Sacle ", (box_mesh.geometry as Three.BoxGeometry).parameters);
            // box_mesh && box_mesh.
            box_mesh && box_mesh.scale.set(l, h, w);

            box_mesh && animation.render();
        }
    }, [l, h, w]);
    
    return (
        <div className="BoxMount" ref={MountElement} />
    );
};


export default Box;

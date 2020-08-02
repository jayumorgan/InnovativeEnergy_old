import React, { useRef, useEffect, useState } from "react";

import * as THREE from "three";

import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";


import WoodTexture from "./images/woodTexture.jpg";
import { Object3D } from "three";


let PalletModel = process.env.PUBLIC_URL + "/models/Pallet.glb";


interface RenderProps {
    cornerNumber: number;
}

function getPyramid() {
    let geometry = new THREE.ConeGeometry(0.05, 0.2, 4);
    let material = new THREE.MeshPhongMaterial({
        color: 0x5fdf39, specular: 0xffffff, shininess: 250,
        side: THREE.DoubleSide, vertexColors: true
    });
    //    var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    let cone = new THREE.Mesh(geometry, material);
    return cone;
    //    scene.add( cone );
};


//--------------- Awful logic + mess. clean up.
function setPyramidPosition(cone: THREE.Mesh, cornerNumber: number) {

    let z_sign = (cornerNumber % 2 == 0) ? -1 : 1;
    let off_sign = (cornerNumber < 2) ? -1 : 1;
    if (cornerNumber === 2) {
        z_sign = 1;
    }
    cone.position.y = 0.3;
    cone.position.x = off_sign * 0.82;
    cone.position.z = z_sign * 1.2;
    cone.rotation.z = off_sign * Math.PI * 11 / 12;
    cone.rotation.x = z_sign * Math.PI / 25;
    cone.rotation.y = z_sign * Math.PI / 4;
};

interface Animation {
    scene: THREE.Scene;
    render: () => void;
}

function PalletRender({ cornerNumber }: RenderProps) {

    let MountElement = useRef<HTMLDivElement>(null);

    let [animation, setAnimation] = useState<Animation | null>(null);

    useEffect(() => {
        let width = (MountElement.current as HTMLDivElement).clientWidth;
        let height = (MountElement.current as HTMLDivElement).clientHeight;

        let scene = new THREE.Scene();
        let renderer = new THREE.WebGLRenderer({ antialias: true });

        let cameraFar = 4;

        let camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
        camera.position.z = 0;
        camera.position.y = cameraFar;
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
                width = mount.clientWidth;
                height = mount.clientHeight;

                renderer.setSize(width, height);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                animate();
            }
        };

        let txt_loader = new THREE.TextureLoader();

        txt_loader.load(color.texture, (txt: THREE.Texture) => {
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
                model.position.y = 0;
                model.rotateY(Math.PI / 2);

                model.traverse((o: Object3D) => {
                    if (o instanceof THREE.Mesh) {
                        (o as THREE.Mesh).material = new_mtl;
                    }
                });
                scene.add(model);

                console.log(model.position);

                let cone = getPyramid();
                setPyramidPosition(cone, cornerNumber);
                cone.name = "Pyramid"

                scene.add(cone);

                handleResize();

                setAnimation({ scene, render: handleResize });
            }, undefined, (error: ErrorEvent) => {
                console.log(error);
            });
        });

        (MountElement.current as HTMLDivElement).appendChild(renderer.domElement);

        animate();
    }, []);

    useEffect(() => {
        if (animation !== null) {
            let { scene, render } = animation;
            let cone = scene.getObjectByName("Pyramid");
            console.log("Animate ");
            if (cone) {
                setPyramidPosition(cone as THREE.Mesh, cornerNumber);
                render();
            }
        }
    }, [cornerNumber, animation]);



    return (
        <div className="PalletMount" ref={MountElement} />
    );
};

export default PalletRender;

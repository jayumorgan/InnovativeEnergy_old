import React, { useRef, useEffect } from "react";
import * as Three from "three";

import { getCamera } from "./Visualizer";

enum Colors {
    Aluminium = 0xa7b0bb,
    Twine = 0xbe9b64,
    MediumBlue = 0x2b3e55
};

enum VectorDirections {
    X = 0,
    Y = 1,
    Z = 2
};

interface ArrowDims {
    zeroX: number;
    zeroY: number;
    length: number;
    width: number;
    offsetX: number;
    offsetY: number;
};


const norm = Math.sqrt(200);
const ArrowDimensions: ArrowDims = {
    zeroX: 0 / norm,
    zeroY: 0 / norm,
    length: 7 / norm,
    width: 6 / norm,
    offsetX: 1 / norm,
    offsetY: 3 / norm,
};

function makeArrow(): Three.Mesh {
    let arrow = new Three.Shape();

    const {
        zeroX,
        zeroY,
        length,
        width,
        offsetX,
        offsetY
    } = ArrowDimensions;

    arrow.moveTo(width / 2, zeroY);
    arrow.lineTo(zeroX, zeroY);
    arrow.lineTo(zeroX, length);
    arrow.lineTo(-offsetX, length);
    arrow.lineTo(width / 2, length + offsetY);
    arrow.lineTo(width + offsetX, length);
    arrow.lineTo(width, length);
    arrow.lineTo(width, zeroY);
    arrow.lineTo(zeroX, zeroY);

    let geometry = new Three.ShapeGeometry(arrow);
    let material = new Three.MeshBasicMaterial({
        color: Colors.MediumBlue
    });
    let mesh = new Three.Mesh(geometry, material);
    mesh.position.set(-width / 2, zeroY, 0.0001);


    return mesh;
};

function makeCircle(): Three.Mesh {
    let geometry = new Three.CircleGeometry(1, 128);
    let material = new Three.MeshBasicMaterial({
        color: Colors.Aluminium
    });
    let circle = new Three.Mesh(geometry, material);
    return circle;
};


export default function Jogger() {

    const mount = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let width = (mount.current as HTMLDivElement).clientWidth;
        let height = (mount.current as HTMLDivElement).clientHeight;
        let renderer = new Three.WebGLRenderer({ antialias: true });
        renderer.setClearColor('white');
        renderer.setSize(width, height);
        let scene = new Three.Scene();
        scene = new Three.Scene();
        scene.background = new Three.Color(0xf8f8f8);
        let hemiLight = new Three.HemisphereLight(0xffffff, 0x444444);
        hemiLight.position.set(0, -20, 50);
        scene.add(hemiLight);
        let dirLight = new Three.DirectionalLight(0xffffff);
        dirLight.position.set(-5, -5, 3);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 10;
        dirLight.shadow.camera.bottom = - 10;
        dirLight.shadow.camera.left = - 10;
        dirLight.shadow.camera.right = 10;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 40;

        let groundMesh = new Three.Mesh(
            new Three.PlaneBufferGeometry(40, 40),
            new Three.MeshBasicMaterial({
                color: 0xf8f8f8,
                /* depthWrite: false */
            })
        );
        let axesHelper = new Three.AxesHelper(5);
        scene.add(axesHelper);

        let circle = makeCircle();
        scene.add(circle);

        groundMesh.rotation.x = - Math.PI / 2;
        groundMesh.receiveShadow = true;
        groundMesh.position.set(0, -1, 0);
        scene.add(groundMesh);
        let camera = getCamera(width, height);
        let distance = 1.2
        camera.up.set(0, 0, 1);
        let back = -3

        camera.position.set(0, back, -0.5 * back);
        camera.lookAt(0, 0, 0);

        const raycaster = new Three.Raycaster();
        const mouse = new Three.Vector2();

        const onMouseMove = (event: any) => {

            console.log("Mouse moving,");

            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

            console.log(mouse);
        };


        // ---------------Arrow---------------
        const makeArrows = () => {


            const upArrow = makeArrow();
            upArrow.position.setComponent(VectorDirections.Y, 0.2);
            scene.add(upArrow);

            const downArrow = makeArrow();
            downArrow.position.setComponent(VectorDirections.Y, -0.2);
            downArrow.rotateZ(Math.PI);
            downArrow.position.setComponent(VectorDirections.X, ArrowDimensions.width / 2);
            scene.add(downArrow);

            const rightArrow = makeArrow();
            rightArrow.rotateZ(- Math.PI / 2);
            rightArrow.position.setComponent(VectorDirections.Y, ArrowDimensions.width / 2);
            rightArrow.position.setComponent(VectorDirections.X, ArrowDimensions.length / 2);
            scene.add(rightArrow);

            const leftArrow = makeArrow();
            leftArrow.rotateZ(Math.PI / 2);
            leftArrow.position.setComponent(VectorDirections.Y, - ArrowDimensions.width / 2);
            leftArrow.position.setComponent(VectorDirections.X, - ArrowDimensions.length / 2);
            scene.add(leftArrow);

            return [upArrow, downArrow, rightArrow, leftArrow];
        };

        const arrows = makeArrows();


        const render_scene = () => {
            requestAnimationFrame(render_scene);
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(arrows);
            for (let i = 0; i < intersects.length; i++) {
                console.log("Intersects i", i);
            }
            console.log("rendering");
            renderer.render(scene, camera);
        };

        const handleResize = () => {
            if (mount.current) {
                width = (mount.current as HTMLDivElement).clientWidth;
                height = (mount.current as HTMLDivElement).clientHeight;
                renderer.setSize(width, height);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                render_scene();
            }
        };

        (mount.current as HTMLDivElement).appendChild(renderer.domElement);
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', onMouseMove, false);
        render_scene();
    }, []);

    return (
        <div className="PersectiveJogger" ref={mount} />
    );
};

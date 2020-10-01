import React, { useRef, useEffect } from "react";
import * as Three from "three";

import { getCamera } from "./Visualizer";

enum Colors {
    Aluminium = 0xa7b0bb,
    Twine = 0xbe9b64,
    MediumBlue = 0x2b3e55,
    Green = 0x5bc47e,
    White = 0xffffff,
    LightBlue = 0xeff2f7
};

enum VectorDirections {
    X = 0,
    Y = 1,
    Z = 2
};

enum PlaneArrowDirections {
    FORWARD,
    BACK,
    LEFT,
    RIGHT
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
    width: 5 / norm,
    offsetX: 1 / norm,
    offsetY: 3 / norm,
};

function setPlaneArrowPosition(mesh: Three.Mesh, direction: PlaneArrowDirections): Three.Mesh {

    switch (direction) {
        case (PlaneArrowDirections.FORWARD): {
            mesh.name = "upArrow";
            mesh.position.setComponent(VectorDirections.Y, 0.25);
            break;

        }
        case (PlaneArrowDirections.BACK): {
            mesh.name = "downArrow";
            mesh.position.setComponent(VectorDirections.Y, -0.25);
            mesh.rotateZ(Math.PI);
            mesh.position.setComponent(VectorDirections.X, ArrowDimensions.width / 2);
            break;
        }
        case (PlaneArrowDirections.RIGHT): {
            mesh.name = "rightArrow";
            mesh.rotateZ(- Math.PI / 2);
            mesh.position.setComponent(VectorDirections.Y, ArrowDimensions.width / 2);
            mesh.position.setComponent(VectorDirections.X, ArrowDimensions.length / 2);
            break;
        }
        case (PlaneArrowDirections.LEFT): {
            mesh.name = "leftArrow";
            mesh.rotateZ(Math.PI / 2);
            mesh.position.setComponent(VectorDirections.Y, - ArrowDimensions.width / 2);
            mesh.position.setComponent(VectorDirections.X, - ArrowDimensions.length / 2);
            break;
        }
    }
    return mesh;
};


function makeVerticalArrow(up: boolean) {
    let arrow = new Three.Shape();

    arrow.moveTo(ArrowDimensions.width / 2 * -1, ArrowDimensions.zeroY);
    arrow.lineTo(ArrowDimensions.zeroX, ArrowDimensions.offsetY * 2)
    arrow.lineTo(ArrowDimensions.width / 2, ArrowDimensions.zeroY);
    arrow.lineTo(ArrowDimensions.zeroX, ArrowDimensions.offsetY / 2);
    arrow.lineTo(ArrowDimensions.width / 2 * -1, ArrowDimensions.zeroY);

    let geometry = new Three.ShapeGeometry(arrow);

    let material = new Three.MeshBasicMaterial({
        color: Colors.MediumBlue
    });

    let mesh = new Three.Mesh(geometry, material);

    if (up) {
        mesh.rotateX(Math.PI / 2);
        mesh.position.set(ArrowDimensions.zeroX, ArrowDimensions.zeroY, 0.45);
    } else {
        mesh.rotateY(Math.PI);
        mesh.rotateX(Math.PI / 2);
        mesh.position.set(ArrowDimensions.zeroX, ArrowDimensions.zeroY, -0.9);
    }

    return mesh;
};


function makeArrow(direction: PlaneArrowDirections): Three.Mesh {
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
    /* let edges = new Three.EdgesGeometry(geometry);
     * let line = new Three.LineSegments(edges, new Three.LineBasicMaterial({     *     color: 0xffffff
     * })); */

    let mesh = new Three.Mesh(geometry, material);
    mesh.position.set(-width / 2, zeroY, 0.0001);

    return setPlaneArrowPosition(mesh, direction);
};

function makeCircle(): Three.Mesh {
    let geometry = new Three.CircleGeometry(1, 128);
    let material = new Three.MeshBasicMaterial({
        color: Colors.LightBlue
    });
    let circle = new Three.Mesh(geometry, material);
    circle.receiveShadow = true;
    circle.castShadow = true;
    return circle;
};


export default function Jogger() {

    const mount = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let width = (mount.current as HTMLDivElement).clientWidth;
        let height = (mount.current as HTMLDivElement).clientHeight;
        let renderer = new Three.WebGLRenderer({ antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = Three.PCFShadowMap;

        renderer.setClearColor('white');
        renderer.setSize(width, height);

        let light = new Three.DirectionalLight(0xffffff, 1, 100);
        light.position.set(0, 1, 0); 			//default; light shining from top
        light.castShadow = true;            // default false
        scene.add(light);


        let scene = new Three.Scene();
        scene.background = new Three.Color(0xffffff);

        const color = 0xFFFFFF;  // white
        const near = 10;
        const far = 100;
        scene.fog = new Three.Fog(color, near, far);

        let hemiLight = new Three.HemisphereLight(0xffffff, 0x444444);
        hemiLight.position.set(0, -10, 7);
        hemiLight.castShadow = true;
        hemiLight.receiveShadow = true;
        scene.add(hemiLight);

        let dirLight = new Three.DirectionalLight(0xffffff);
        dirLight.position.set(0, -10, 7);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 10;
        dirLight.shadow.camera.bottom = - 10;
        dirLight.shadow.camera.left = - 10;
        dirLight.shadow.camera.right = 10;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 500;
        scene.add(dirLight);

        let groundMesh = new Three.Mesh(
            new Three.PlaneBufferGeometry(40, 40),
            new Three.MeshBasicMaterial({
                color: 0x000000,
                /* depthWrite: false */
            })
        );

        groundMesh.receiveShadow = true;
        groundMesh.castShadow = true;
        groundMesh.position.set(0, 0, -3);
        scene.add(groundMesh);


        let axesHelper = new Three.AxesHelper(5);
        scene.add(axesHelper);

        let circle = makeCircle();
        scene.add(circle);

        let camera = getCamera(width, height);
        camera.up.set(0, 0, 1);
        let back = -3

        camera.position.set(0, back, -0.5 * back);
        camera.lookAt(0, 0, 0);

        // ---------------Arrow---------------
        const makeArrows = () => {
            const upArrow = makeArrow(PlaneArrowDirections.FORWARD);
            scene.add(upArrow);
            const downArrow = makeArrow(PlaneArrowDirections.BACK);
            scene.add(downArrow);
            const rightArrow = makeArrow(PlaneArrowDirections.RIGHT);
            scene.add(rightArrow);
            const leftArrow = makeArrow(PlaneArrowDirections.LEFT);
            scene.add(leftArrow);

            /* var edges = new Three.EdgesGeometry(leftArrow.geometry);
	     * var line = new Three.LineSegments(edges, new Three.LineBasicMaterial({ color: 0xffffff }));
	     * scene.add(line); */

            const upZArrow = makeVerticalArrow(true);
            upZArrow.name = "upZArrow";
            scene.add(upZArrow);

            const downZArrow = makeVerticalArrow(false);
            downZArrow.name = "downZArrow";
            scene.add(downZArrow);

            return [upArrow, downArrow, rightArrow, leftArrow, upZArrow, downZArrow];
        };

        const arrows = makeArrows();
        const raycaster = new Three.Raycaster();
        const mouse = new Three.Vector2();

        const render_scene = () => {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(arrows);
            arrows.forEach((a: Three.Mesh) => {
                (a.material as Three.MeshBasicMaterial).color.setHex(Colors.MediumBlue);
            });

            for (let i = 0; i < intersects.length; i++) {
                ((intersects[i].object as Three.Mesh).material as Three.MeshBasicMaterial).color.setHex(Colors.Green);
            }
            renderer.render(scene, camera);
        };

        const onMouseMove = (event: any) => {
            mouse.x = (event.offsetX / width) * 2 - 1;
            mouse.y = - (event.offsetY / height) * 2 + 1;
            render_scene();
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
        (mount.current as HTMLDivElement).addEventListener('mousemove', onMouseMove, false);
        render_scene();
    }, []);

    return (
        <div className="PersectiveJogger" ref={mount} />
    );
};

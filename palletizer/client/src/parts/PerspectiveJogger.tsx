import React, { useRef, useEffect } from "react";
import * as Three from "three";

import { getCamera } from "./Visualizer";
import { Coordinate } from "../geometry/geometry";


const LatoPath: string = "fonts/json/Lato_Bold.json";


enum Colors {
    Aluminium = 0xa7b0bb,
    Twine = 0xbe9b64,
    MediumBlue = 0x2b3e55,
    Green = 0x5bc47e,
    White = 0xffffff,
    LightBlue = 0xeff2f7,
    Black = 0x000000
};

enum VectorDirections {
    X = 0,
    Y = 1,
    Z = 2
};

enum PlaneArrowDirections {
    FORWARD = "Forward",
    BACK = "Backward",
    LEFT = "Left",
    RIGHT = "Right",
    UP = "Up",
    DOWN = "Down",
    ANGLE = "Angle"
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


function makeVerticalArrow(up: boolean): Three.Mesh {
    const arrow = new Three.Shape();

    arrow.moveTo(ArrowDimensions.width / 2 * -1, ArrowDimensions.zeroY);
    arrow.lineTo(ArrowDimensions.zeroX, ArrowDimensions.offsetY * 2)
    arrow.lineTo(ArrowDimensions.width / 2, ArrowDimensions.zeroY);
    arrow.lineTo(ArrowDimensions.zeroX, ArrowDimensions.offsetY / 2);
    arrow.lineTo(ArrowDimensions.width / 2 * -1, ArrowDimensions.zeroY);

    const geometry = new Three.ShapeGeometry(arrow);

    const material = new Three.MeshBasicMaterial({
        color: Colors.MediumBlue
    });

    const mesh = new Three.Mesh(geometry, material);

    if (up) {
        mesh.rotateX(Math.PI / 2);
        mesh.name = String(PlaneArrowDirections.UP);
        mesh.position.set(ArrowDimensions.zeroX, ArrowDimensions.zeroY, 0.45);
    } else {
        mesh.rotateY(Math.PI);
        mesh.rotateX(Math.PI / 2);
        mesh.name = String(PlaneArrowDirections.DOWN);
        mesh.position.set(ArrowDimensions.zeroX, ArrowDimensions.zeroY, -0.9);
    }

    return mesh;
};


function makeAngleArrow(): Three.Mesh {
    let arrow = makeVerticalArrow(true);
    arrow.rotateX(-Math.PI / 2);
    arrow.rotateZ(Math.PI);
    arrow.name = String(PlaneArrowDirections.ANGLE);
    arrow.position.set(0, 1.4, 0.01);
    arrow.scale.set(0.5, 0.5, 0.5);

    return arrow;
};



function makeArrow(direction: PlaneArrowDirections): Three.Mesh {
    const arrow = new Three.Shape();

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

    const geometry = new Three.ShapeGeometry(arrow);
    const material = new Three.MeshBasicMaterial({
        color: Colors.MediumBlue
    });

    const mesh = new Three.Mesh(geometry, material);
    mesh.position.set(-width / 2, zeroY, 0.0001);
    mesh.name = String(direction);

    return setPlaneArrowPosition(mesh, direction);
};

function makeCircle(): Three.Mesh {
    const geometry = new Three.CircleGeometry(1, 128);
    const material = new Three.MeshBasicMaterial({
        color: Colors.LightBlue
    });
    const circle = new Three.Mesh(geometry, material);
    circle.receiveShadow = true;
    circle.castShadow = true;
    return circle;
};

function makeArc(): Three.Mesh {
    let shape = new Three.Shape();
    let radius = 1.1;
    let shift = 0.02;

    shape.moveTo(0, radius);
    shape.absarc(0, 0, radius, Math.PI / 2, - Math.PI / 2, true);
    shape.lineTo(0, -radius + shift);
    shape.absarc(0, 0, radius - shift, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(0, radius);
    let geometry = new Three.ShapeGeometry(shape);
    let material = new Three.MeshBasicMaterial({
        color: Colors.LightBlue
    });

    let mesh = new Three.Mesh(geometry, material);
    return mesh;
};

function makeLabels(font: Three.Font, scene: Three.Scene): void {
    const matLite = new Three.MeshBasicMaterial({
        color: Colors.White,
    });

    const make_text = (s: string, p: Coordinate, rotationX: number = 0, size: number = 0.1) => {
        let shapes = font.generateShapes(s, size);
        let geometry = new Three.ShapeBufferGeometry(shapes);
        let text = new Three.Mesh(geometry, matLite);
        text.position.set(p.x, p.y, p.z);
        text.rotateX(rotationX);
        scene.add(text);
    };

    make_text("+y", { x: -0.09, y: 0.6, z: 0.001 });
    make_text("+x", { x: 0.6, y: -0.05, z: 0.001 });
    make_text("+z", { x: -0.06, y: -0.0001, z: 0.6 }, Math.PI / 2, 0.07);
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

        const scene = new Three.Scene();
        scene.background = new Three.Color(0xffffff);

        const color = 0xFFFFFF;  // white
        const near = 10;
        const far = 100;
        scene.fog = new Three.Fog(color, near, far);

        const groundMesh = new Three.Mesh(
            new Three.PlaneBufferGeometry(40, 40),
            new Three.MeshBasicMaterial({
                color: Colors.White,
                /* depthWrite: false */
            })
        );

        groundMesh.receiveShadow = true;
        groundMesh.castShadow = true;
        groundMesh.position.set(0, 0, -3);
        scene.add(groundMesh);


        /* let axesHelper = new Three.AxesHelper(5);
	 * scene.add(axesHelper);
	 */
        const circle = makeCircle();
        scene.add(circle);

        const arc = makeArc();
        arc.position.set(0, 0, 0.0005);
        scene.add(arc);

        const camera = getCamera(width, height);
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
            const upZArrow = makeVerticalArrow(true);
            scene.add(upZArrow);
            const downZArrow = makeVerticalArrow(false);
            scene.add(downZArrow);
            const angleArrow = makeAngleArrow();
            scene.add(angleArrow);

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

        const fontLoader = new Three.FontLoader();
        fontLoader.loadAsync(LatoPath).then((font: Three.Font) => {
            makeLabels(font, scene);
            render_scene();
        }).catch((e: any) => {
            console.log("Failed to load font", e);
        })



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

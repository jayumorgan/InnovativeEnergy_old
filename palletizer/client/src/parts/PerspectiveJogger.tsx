import React, { useRef, useEffect, useState } from "react";
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
    Black = 0x000000,
    Alabaster = 0xfbfbfb,
};

enum VectorDirections {
    X = 0,
    Y = 1,
    Z = 2
};

export enum PlaneArrowDirections {
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
    mesh.name = String(direction);
    switch (direction) {
        case (PlaneArrowDirections.FORWARD): {
            mesh.position.setComponent(VectorDirections.Y, 0.25);
            break;
        }
        case (PlaneArrowDirections.BACK): {
            mesh.position.setComponent(VectorDirections.Y, -0.25);
            mesh.rotateZ(Math.PI);
            mesh.position.setComponent(VectorDirections.X, ArrowDimensions.width / 2);
            break;
        }
        case (PlaneArrowDirections.RIGHT): {
            mesh.rotateZ(- Math.PI / 2);
            mesh.position.setComponent(VectorDirections.Y, ArrowDimensions.width / 2);
            mesh.position.setComponent(VectorDirections.X, ArrowDimensions.length / 2);
            break;
        }
        case (PlaneArrowDirections.LEFT): {
            mesh.rotateZ(Math.PI / 2);
            mesh.position.setComponent(VectorDirections.Y, - ArrowDimensions.width / 2);
            mesh.position.setComponent(VectorDirections.X, - ArrowDimensions.length / 2);
            break;
        }
    }
    return mesh;
};


const verticalArrowTop: number = 0.3
const vertialArrowBottom: number = -1.1;

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
        mesh.position.set(ArrowDimensions.zeroX, 1, verticalArrowTop);
    } else {
        mesh.rotateY(Math.PI);
        mesh.rotateX(Math.PI / 2);
        mesh.name = String(PlaneArrowDirections.DOWN);
        mesh.position.set(ArrowDimensions.zeroX, ArrowDimensions.zeroY, vertialArrowBottom);
    }

    return mesh;
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

function makeLabels(font: Three.Font, scene: Three.Scene): void {
    const matLite = new Three.MeshBasicMaterial({
        color: Colors.White,
    });

    const make_text = (s: string, p: Coordinate, rotationX: number = 0, size: number = 0.1) => {
        const shapes = font.generateShapes(s, size);
        const geometry = new Three.ShapeBufferGeometry(shapes);
        const text = new Three.Mesh(geometry, matLite);
        text.position.set(p.x, p.y, p.z);
        text.rotateX(rotationX);
        scene.add(text);
    };
    make_text("+X", { x: 0.6, y: -0.05, z: 0.001 });
    make_text("+Y", { x: -0.09, y: 0.6, z: 0.001 });
    make_text("+Z", { x: -0.07, y: 1 - 0.0001, z: verticalArrowTop + 0.15 }, Math.PI / 2, 0.07);
};

const angleArcRadius: number = 0.4;
const angleArcHeight: number = 0.4;
const angleArrowRadius: number = angleArcRadius;
const angleArrowStartingRotation: number = Math.PI / 2;
const angleArrowTextOffset: number = - 0.02
const angleArrowTextOffsetY: number = 0.1;
const angleArrowYCoordinate: number = 0.5;


function getArcGeometry(reflect: boolean) {
    let shape = new Three.Shape();
    const radius = angleArcRadius;
    let shift = 0.1;

    //-------Old 180deg Arc-------
    /* shape.moveTo(0, radius);
	 * shape.absarc(0, 0, radius, Math.PI / 2, - Math.PI / 2, true);
	 * shape.lineTo(0, -radius + shift);
	 * shape.absarc(0, 0, radius - shift, -Math.PI / 2, Math.PI / 2, false);
	 * shape.lineTo(0, radius); */

    //-------90deg Arc-------
    shape.moveTo(radius, 0);
    shape.absarc(0, 0, radius, 0, -Math.PI / 2, true);

    // Arrow
    if (!reflect) {
        shape.lineTo(0, -radius - 0.5 * shift);
        shape.lineTo(-shift * 1.5, -radius + shift / 2);
        shape.lineTo(0, -radius + shift + 0.5 * shift);
    }

    shape.lineTo(0, -radius + shift);
    shape.absarc(0, 0, radius - shift, - Math.PI / 2, 0, false);

    if (reflect) {
        shape.lineTo(radius - 0.5 * shift - shift, 0);
        shape.lineTo(radius - shift / 2, shift * 1.5);
        shape.lineTo(radius + 0.5 * shift, 0);
    }

    shape.lineTo(radius, 0);
    const geometry = new Three.ShapeGeometry(shape);
    return geometry;
}

function makeArc(): Three.Mesh {

    const material = new Three.MeshBasicMaterial({
        color: Colors.MediumBlue //Colors.LightBlue
    });

    const geometry = getArcGeometry(false);

    const mesh = new Three.Mesh(geometry, material);
    mesh.name = String(PlaneArrowDirections.ANGLE);
    //  mesh.rotation.x = 0.05;
    return mesh;
};

function makeAngleArrowText(θ: number, font: Three.Font): Three.Mesh {
    const matLite = new Three.MeshBasicMaterial({
        color: Colors.MediumBlue,
    });
    const shapes = font.generateShapes(String(θ) + "°", 0.05);
    const geometry = new Three.ShapeBufferGeometry(shapes);
    const text = new Three.Mesh(geometry, matLite);
    text.rotateX(Math.PI / 2);
    text.position.set(angleArrowTextOffset + angleArrowTextOffsetY + angleArrowRadius, angleArrowYCoordinate, angleArcHeight);
    return text;
};


//---------------Main Component---------------

export interface PerspectiveJoggerProps {
    handleCartesianMove: (d: PlaneArrowDirections) => void;
    handleRotateMove: (angle: number) => void;
};

export default function Jogger({ handleCartesianMove, handleRotateMove }: PerspectiveJoggerProps) {

    const mount = useRef<HTMLDivElement>(null);

    const handleJogClick = (d: PlaneArrowDirections) => {
        handleCartesianMove(d);
    };

    useEffect(() => {
        let isRotated: boolean = false; // Discrete angle.

        let width = (mount.current as HTMLDivElement).clientWidth;
        let height = (mount.current as HTMLDivElement).clientHeight;
        const renderer = new Three.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);

        renderer.setClearColor('white');
        renderer.setSize(width, height);

        const scene = new Three.Scene();
        scene.background = new Three.Color(Colors.Alabaster);

        const camera = getCamera(width, height);
        camera.up.set(0, 0, 1);
        const back = -2.6
        camera.position.set(0, back, -0.5 * back);
        camera.lookAt(0, 0, 0);

        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();

        const groundMesh = new Three.Mesh(
            new Three.PlaneBufferGeometry(40, 40),
            new Three.MeshBasicMaterial({
                color: Colors.Alabaster,
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
            const arc = makeArc();
            arc.position.set(0, angleArrowYCoordinate, angleArcHeight);
            arc.geometry.computeBoundingBox();
            arc.name = String(PlaneArrowDirections.ANGLE);
            scene.add(arc);
            return [upArrow, downArrow, rightArrow, leftArrow, upZArrow, downZArrow, arc];
        };

        const arrows = makeArrows();
        const raycaster = new Three.Raycaster();
        const mouse = new Three.Vector2();

        let getArrows = () => { return arrows; };

        const render_scene = (force: boolean = false) => {
            raycaster.setFromCamera(mouse, camera);
            const all_arrows = getArrows();
            const intersects = raycaster.intersectObjects(all_arrows);
            let changed = false;
            all_arrows.forEach((a: Three.Mesh) => {
                let current = (a.material as Three.MeshBasicMaterial).color.getHex();
                if (current !== Colors.MediumBlue) {
                    changed = true;
                }
                (a.material as Three.MeshBasicMaterial).color.setHex(Colors.MediumBlue);
            });
            for (let i = 0; i < intersects.length; i++) {
                changed = true;
                ((intersects[i].object as Three.Mesh).material as Three.MeshBasicMaterial).color.setHex(Colors.Green);
            }
            if (force || changed) { // try to avoid expensive operation.
                renderer.render(scene, camera);
            }
        };

        let angleArrowMesh: null | Three.Mesh = null;
        let angleArrowText: null | Three.Mesh = null;
        let angleArrowFont: null | Three.Font = null;

        const fontLoader = new Three.FontLoader();
        fontLoader.loadAsync(LatoPath).then((font: Three.Font) => {
            makeLabels(font, scene);
            const angleText = makeAngleArrowText(isRotated ? 90 : 0, font);
            scene.add(angleText);
            angleArrowFont = font;
            angleArrowText = angleText;
            render_scene(true);
        }).catch((e: any) => {
            console.log("Failed to load font", e);
        });

        const onMouseMove = (event: any) => {
            mouse.x = (event.offsetX / width) * 2 - 1;
            mouse.y = - (event.offsetY / height) * 2 + 1;
            render_scene();
        };

        const handleAngleText = () => {
            if (angleArrowFont && angleArrowText) {
                const font = angleArrowFont;
                const shapes = font.generateShapes(String(isRotated ? 90 : 0) + "°", 0.05);
                const geometry = new Three.ShapeBufferGeometry(shapes);
                angleArrowText.geometry = geometry;
            }
        }

        const rotateAngleArc = () => {
            let obj = scene.getObjectByName(PlaneArrowDirections.ANGLE);
            if (obj) {
                const mesh: Three.Mesh = (obj as Three.Mesh);
                mesh.geometry = getArcGeometry(isRotated);
                //                mesh.rotation.z = isRotated ? - Math.PI / 2 : 0;
                //              mesh.rotation.x = isRotated ? Math.PI : 0;
                handleAngleText();
                render_scene(true);
            }
        };

        const handleAngleClick = () => {
            handleRotateMove(isRotated ? 0 : 90);
            /* handleAngleJog(isRotated ? 0 : 90); */
            isRotated = !isRotated;
            rotateAngleArc();
        };

        const onMouseClick = (event: any) => {
            mouse.x = (event.offsetX / width) * 2 - 1;
            mouse.y = - (event.offsetY / height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const all_arrows = getArrows();
            const intersects = raycaster.intersectObjects(all_arrows);
            if (intersects.length > 0) {
                const first = intersects.shift();
                if (first) {
                    const name: PlaneArrowDirections = (first.object as Three.Mesh).name as PlaneArrowDirections;
                    if (PlaneArrowDirections.ANGLE === name) {
                        handleAngleClick();
                        // startAngleDrag(); // Old.
                    } else {
                        handleJogClick(name);
                    }
                }
            }
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
        (mount.current as HTMLDivElement).addEventListener('mousedown', onMouseClick, false);
        render_scene(true);
    }, []);

    return (
        <div className="PersectiveJogger" ref={mount} />
    );
};

import React, { useEffect, useRef, useContext, useState } from 'react';

// 3D rendering
import * as Three from "three";

// Context
import { PalletizerContext } from "../context/PalletizerContext";
import { ConfigContext } from "../context/ConfigContext";

// Requests
import { get_state_config } from "../requests/requests";

// Types
import { ConfigState } from "../types/Types";

// Styles.
import "./css/Visualizer.scss";

// Images.
import wood from "./images/wood.jpg";
import carboard from "./images/cardboard.jpg";
import vcardboard from "./images/vcardboard.jpg";

import { COLORS } from "./teach/shared/Colors";

// Interfaces / Functions For Pallet Configuration.
import { PalletGeometry, getPalletDimensions, BoxObject, BoxCoordinates, getCenterOfPallet } from "./teach/structures/Data";
import { SavedPalletConfiguration } from "./TeachMode";


interface FrameDimensions {
    xl: number;
    xh: number;
    yl: number;
    yh: number;
    h: number;
};

function getCornerExtrema(c: Coordinate) {

    let { x, y, z } = c;

    let f: FrameDimensions = {
        xl: Infinity,
        xh: -Infinity,
        yl: Infinity,
        yh: -Infinity,
        h: 0
    };

    if (x < f.xl) {
        f.xl = x;
    }
    if (x > f.xh) {
        f.xh = x;
    }

    if (y < f.yl) {
        f.yl = y;
    }

    if (y > f.yh) {
        f.yh = y;
    }
}

function getPalletExtrema(p: PalletGeometry) {
    let { corner1, corner2, corner3 } = p;
    let x1 = corner1.x;
    let x2 = corner2.x;
    let x3 = corner3.x;
    let y1 = corner1.y;
    let y2 = corner2.y;
    let y3 = corner3.y;

    let X = [x1, x2, x3];
    let Y = [y1, y2, y3];

    let f: FrameDimensions = {
        xl: Math.min(x1, x2, x3),
        xh: Math.max(x1, x2, x3),
        yl: Math.min(y1, y2, y3),
        yh: Math.max(y1, y2, y3),
        h: 0
    };

    return f;
};


function FrameNorm(f: FrameDimensions) {
    let dx = f.xh - f.xl;
    let dy = f.yh - f.yl;
    let dz = f.h;

    return Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
};


function parseConfig(pallet: SavedPalletConfiguration) {
    let usedPallets: PalletGeometry[] = (() => {
        let Ps = [] as PalletGeometry[];
        pallet.config.pallets.forEach((p: PalletGeometry) => {
            if (p.Stack.length > 0) {
                Ps.push({ ...p })
            }
        });
        return Ps;
    })();

    let X = [] as number[];
    let Y = [] as number[];
    let H = 0 as number;

    usedPallets.forEach((p: PalletGeometry) => {
        let h = 0;
        p.Stack.forEach((s: number) => {

            h += p.Layouts[s].height;
        });
        if (h > H) {
            H = h;
        }

        let { xl, xh, yl, yh } = getPalletExtrema(p);
        X.push(xl);
        X.push(xh);
        Y.push(yl);
        Y.push(yh);
    });

    let f: FrameDimensions = {
        xl: Math.min(...X),
        xh: Math.max(...X),
        yl: Math.min(...Y),
        yh: Math.max(...Y),
        h: H
    };

    return f;
};

function get_camera(width: number, height: number): Three.PerspectiveCamera {
    let camera = new Three.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 1.2, 1.2);
    // camera.position.set(0, 2, 2);
    camera.lookAt(0, 0, 0);
    return camera;
}

function get_scene(): Three.Scene {
    let scene = new Three.Scene();
    scene = new Three.Scene();
    scene.background = new Three.Color(0xf8f8f8);

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
            color: 0xf8f8f8,
            depthWrite: false
        })
    );

    groundMesh.rotation.x = - Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    return scene;
};

/* function get_green_cardboard_box(width: number, height: number, length: number): Three.Mesh {
 *     let box = get_cardboard_box(width, height, length);
 *     (box.material as Three.Material[]).forEach((mat: Three.Material) => {
 *         let m = mat as Three.MeshBasicMaterial;
 *         m.color.setRGB(0, 1, 0);
 * 
 *         // color = "rgb(250, 234, 47)"
 *     });
 *     return box;
 * };
 *  */

export function getCardboardBox(width: number, height: number, length: number): Three.Mesh {
    let geometry = new Three.BoxGeometry(width, height, length);
    let material = new Three.MeshPhongMaterial({ color: String(COLORS.BOX) });
    let edgeGeometry = new Three.EdgesGeometry(geometry);
    let edgeMaterial = new Three.LineBasicMaterial({ color: String(COLORS.LOG), linewidth: 1 });
    let edges = new Three.LineSegments(edgeGeometry, edgeMaterial);

    let box = new Three.Mesh(geometry, material);
    box.add(edges);
    return box;
};

interface Coordinate { // To allow for angle.
    x: number;
    y: number;
    z: number;
};

interface VisualizerControls {
    add_mesh(mesh: Three.Mesh): void;
    removeBox: (n: string) => void;
};

function get_box_name(box_number: number): string {
    return "Box-" + String(box_number);
};



function getPlank(w: number, h: number, l: number) {
    let g = new Three.BoxGeometry(w, h, l);
    let m = new Three.MeshPhongMaterial({ color: String(COLORS.PLANK) });
    let p = new Three.Mesh(g, m);
    return p;
}


function GetPalletMesh(width: number, height: number, length: number, callback: (pallet: Three.Mesh, height: number) => void) {

    let singleGeometry = new Three.Geometry();

    let fullHeight = height * 20;

    //let singleGeometry = new Three.BoxGeometry(width, fullHeight, lenght);

    let zeroX = -width / 2;
    let zeroY = -length / 2;
    let zeroZ = -fullHeight / 2;


    let plankWidth = length / 20;
    let plankHeight = fullHeight * 4 / 5;
    let plankLength = width;

    let plank1 = getPlank(plankWidth, plankHeight, plankLength);

    plank1.rotateY(Math.PI / 2);
    let plank2 = plank1.clone();
    plank1.position.set(zeroX + width / 2, zeroZ + plankHeight / 2, zeroY + length - plankWidth / 2);
    plank2.position.set(zeroX + width / 2, zeroZ + plankHeight / 2, zeroY + plankWidth / 2);


    let crossPlank1 = getPlank(plankWidth, plankHeight, length - plankWidth);
    let crossPlank2 = crossPlank1.clone();

    crossPlank1.position.set(zeroX + plankWidth / 2, zeroZ + plankHeight / 2, zeroY + (length - plankWidth) / 2);
    crossPlank2.position.set(zeroX + width - plankWidth / 2, zeroZ + plankHeight / 2, zeroY + (length - plankWidth) / 2);


    singleGeometry.mergeMesh(crossPlank1);
    singleGeometry.mergeMesh(crossPlank2);


    let boardNumber = 6;
    let spaceFraction = 2 / 3;
    let boardWidth = width * spaceFraction / boardNumber;
    let boardHeight = fullHeight * 1 / 5;

    let startX = (boardWidth / 2);
    let incrementX = (width - boardNumber * boardWidth) / (boardNumber - 1) + boardWidth;


    let board1 = getPlank(boardWidth, boardHeight, length);
    for (let i = 0; i < boardNumber; i++) {
        let b = board1.clone();
        b.position.set(zeroX + startX + i * incrementX, zeroZ + fullHeight - boardHeight / 2, zeroY + length / 2);
        singleGeometry.mergeMesh(b);
    }

    singleGeometry.mergeMesh(plank1);
    singleGeometry.mergeMesh(plank2);

    let m = new Three.MeshPhongMaterial({ color: String(COLORS.PLANK) });

    let fullMesh = new Three.Mesh(singleGeometry, m);



    callback(fullMesh, fullHeight);
};

interface VisualizerProps {
    palletConfig: SavedPalletConfiguration;
    currentBoxNumber: number;
};

// Set the scene.
function Visualizer({ palletConfig, currentBoxNumber }: VisualizerProps) {
    let mount = useRef<HTMLDivElement>(null);

    let controls = useRef<VisualizerControls | null>(null);
    let box_positions = useRef<Coordinate[] | null>(null);

    let [boxNames, setBoxNames] = useState<string[]>([]);

    useEffect(() => {
        let width = (mount.current as HTMLDivElement).clientWidth;
        let height = (mount.current as HTMLDivElement).clientHeight;

        let renderer = new Three.WebGLRenderer({ antialias: true });
        renderer.setClearColor('white');
        renderer.setSize(width, height);

        let scene = new Three.Scene();
        scene = new Three.Scene();
        scene.background = new Three.Color(0xf8f8f8);
        //        scene.fog = new Three.Fog(0xa0a0a0, 1, 10);

        let hemiLight = new Three.HemisphereLight(0xffffff, 0x444444);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

        let dirLight = new Three.DirectionalLight(0xffffff);
        dirLight.position.set(2, 2, 0.5);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 10;
        dirLight.shadow.camera.bottom = - 10;
        dirLight.shadow.camera.left = - 10;
        dirLight.shadow.camera.right = 10;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 40;
        // scene.add(dirLight);

        // ground
        var groundMesh = new Three.Mesh(
            new Three.PlaneBufferGeometry(40, 40),
            new Three.MeshBasicMaterial({
                color: 0xf8f8f8,
                /* depthWrite: false */
            })
        );

        groundMesh.rotation.x = - Math.PI / 2;
        groundMesh.receiveShadow = true;
        groundMesh.position.set(0, -1, 0);
        scene.add(groundMesh);

        var axesHelper = new Three.AxesHelper(5);
        scene.add(axesHelper);

        let camera = get_camera(width, height);
        let distance = 2
        camera.position.set(distance, distance, distance);
        camera.lookAt(0, -0.1, 0);

        let render_scene = () => {
            renderer.render(scene, camera);
        };

        let add_mesh = (mesh: Three.Mesh) => {
            scene.add(mesh);
            render_scene();
        };

        let removeBox = (n: string) => {
            let box = scene.getObjectByName(n);
            if (box) {
                scene.remove(box);
            }
        };


        let handleResize = () => {
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

        render_scene();
        controls.current = {
            add_mesh,
            removeBox
        } as VisualizerControls;
    }, []);

    useEffect(() => {
        if (palletConfig && controls.current) {

            let frameDims = parseConfig(palletConfig);

            let frameNorm = FrameNorm(frameDims);

            // Look at frame center

            // Loop through the things and get them all
            palletConfig.config.pallets.forEach((p: PalletGeometry) => {
                let { width, length } = getPalletDimensions(p);

                let height = 5;

                console.log("Pallet Dims ", width, length);

                width /= frameNorm;
                height /= frameNorm;
                length /= frameNorm;

                console.log("Pallet Dims ", width, length);
                let { x, y, z } = getCenterOfPallet(p);

                console.log("Center of pallet: ", getCenterOfPallet(p));

                x /= frameNorm;
                y /= frameNorm;
                z /= frameNorm;
                console.log(z);
                z = - height;
                console.log(z);
                // z = - height;

                GetPalletMesh(width, height, length, (palletMesh: Three.Mesh, height: number) => {
                    console.log("Mesh Position ", palletMesh.position);
                    z = -height;
                    palletMesh.position.set(x, z, y);
                    console.log("Mesh Position ", palletMesh.position);
                    controls.current?.add_mesh(palletMesh);
                });
            });
            // Identify by layer? -- associate to pallet?

            let zHome = 1; // (-1 for bottom);


            palletConfig.boxCoordinates.forEach((b: BoxCoordinates, i: number) => {
                if (i < currentBoxNumber) {


                    let BoxName = "BOXNAME-" + String(i);

                    let { dropLocation, dimensions, palletIndex } = b;

                    let pallet = palletConfig.config.pallets[palletIndex];

                    let { width, height, length } = dimensions;

                    width /= frameNorm;
                    height /= frameNorm;
                    length /= frameNorm;

                    let box = getCardboardBox(width, height, length);
                    box.name = BoxName;

                    let { x, y, z } = dropLocation;

                    x /= frameNorm;
                    y /= frameNorm;
                    z = 0;
                    z += zHome * height / 2;

                    console.log(x, y, z, "Box positions", height, "height");

                    box.position.set(x, z, y);

                    if (dropLocation.i) {
                        box.rotateY(Math.PI / 2);
                    }

                    controls.current?.add_mesh(box);
                }
            });


        }
    }, [palletConfig]);

    return (<div className="Visualizer" ref={mount} />);
}
export default Visualizer;


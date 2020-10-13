import React, { useEffect, useRef, useState, useContext } from 'react';
import * as Three from "three";
import { COLORS } from "./shared/shared";
import {
    PalletGeometry,
    getPalletDimensions,
    BoxCoordinates,
    getCenterOfPallet,
    CoordinateRot,
    Subtract3D,
    Add3D,
    getXAxisAngle
} from "../geometry/geometry";
import { SavedPalletConfiguration } from "./TeachMode";
import { PalletizerContext } from "../context/PalletizerContext";

//---------------Styles---------------
import "./css/Visualizer.scss";


//NB: Frame dimension code is quite stupid -- fix later.

interface FrameDimensions {
    xl: number;
    xh: number;
    yl: number;
    yh: number;
    h: number;
};

function getPalletExtrema(p: PalletGeometry): FrameDimensions {
    let { corner1, corner2, corner3 } = p;
    let x1 = corner1.x;
    let x2 = corner2.x;
    let x3 = corner3.x;
    let y1 = corner1.y;
    let y2 = corner2.y;
    let y3 = corner3.y;

    let X = [x1, x2, x3];
    let Y = [y1, y2, y3];

    return {
        xl: Math.min(...X),
        xh: Math.max(...X),
        yl: Math.min(...Y),
        yh: Math.max(...Y),
        h: 0
    } as FrameDimensions;
};


function FrameNorm(f: FrameDimensions) {
    let dx = f.xh - f.xl;
    let dy = f.yh - f.yl;
    //    let dz = f.h;
    return Math.sqrt(dx ** 2 + dy ** 2) / Math.sqrt(2);
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

export function getCamera(width: number, height: number): Three.PerspectiveCamera {
    let camera = new Three.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 1.2, 1.2);
    // camera.position.set(0, 2, 2);
    camera.lookAt(0, 0, 0);
    return camera;
}

export function getCardboardBox(width: number, height: number, length: number): Three.Mesh {
    let geometry = new Three.BoxGeometry(width, length, height);
    let material = new Three.MeshPhongMaterial({ color: String(COLORS.BOX) });
    let edgeGeometry = new Three.EdgesGeometry(geometry);
    let edgeMaterial = new Three.LineBasicMaterial({ color: String(COLORS.LOG), linewidth: 1 });
    let edges = new Three.LineSegments(edgeGeometry, edgeMaterial);
    let box = new Three.Mesh(geometry, material);
    box.add(edges);
    return box;
};

interface VisualizerControls {
    add_mesh: (mesh: Three.Mesh) => void;
    remove_mesh: (n: string) => void;
};

function getPlank(w: number, h: number, l: number) {
    let g = new Three.BoxGeometry(w, l, h);
    let m = new Three.MeshPhongMaterial({ color: String(COLORS.PLANK) });
    let p = new Three.Mesh(g, m);
    return p;
};

function GetPalletMesh(width: number, length: number, height: number, callback: (pallet: Three.Mesh, fheight: number) => void) {

    let singleGeometry = new Three.Geometry();

    let fullHeight = height * 20;

    let zeroX = -width / 2;
    let zeroY = -length / 2;
    let zeroZ = -fullHeight / 2;

    let plankWidth = length / 20;
    let plankHeight = fullHeight * 4 / 5;
    let plankLength = width;

    let plank1 = getPlank(plankLength, plankHeight, plankWidth);
    let plank2 = plank1.clone();

    plank1.position.set(zeroX + width / 2, zeroY + length - plankWidth / 2, zeroZ + plankHeight / 2);
    plank2.position.set(zeroX + width / 2, zeroY + plankWidth / 2, zeroZ + plankHeight / 2);

    let crossPlank1 = getPlank(plankWidth, plankHeight, length - plankWidth);
    let crossPlank2 = crossPlank1.clone();

    crossPlank1.position.set(zeroX + plankWidth / 2, zeroY + (length - plankWidth) / 2, zeroZ + plankHeight / 2);
    crossPlank2.position.set(zeroX + width - plankWidth / 2, zeroY + (length - plankWidth) / 2, zeroZ + plankHeight / 2);

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
        b.position.set(zeroX + startX + i * incrementX, zeroY + length / 2, zeroZ + fullHeight - boardHeight / 2);
        singleGeometry.mergeMesh(b);
    }

    singleGeometry.mergeMesh(plank1);
    singleGeometry.mergeMesh(plank2);

    let m = new Three.MeshPhongMaterial({ color: String(COLORS.PLANK) });

    let fullMesh = new Three.Mesh(singleGeometry, m);

    callback(fullMesh, fullHeight);
};

export interface VisualizerProps {
    palletConfig?: SavedPalletConfiguration;
    dropCoordinates?: CoordinateRot[];
    currentBoxNumber: number;
};

// Set the scene.
export default function Visualizer({ palletConfig, currentBoxNumber, dropCoordinates }: VisualizerProps) {

    let current_box = currentBoxNumber;
    const mount = useRef<HTMLDivElement>(null);
    const controls = useRef<VisualizerControls | null>(null);

    const [boxNames, setBoxNames] = useState<string[]>([]);
    const [palletNames, setPalletNames] = useState<string[]>([]);

    useEffect(() => {
        let width = (mount.current as HTMLDivElement).clientWidth;
        let height = (mount.current as HTMLDivElement).clientHeight;

        const renderer = new Three.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor('white');
        renderer.setSize(width, height);

        let scene = new Three.Scene();
        scene.background = new Three.Color(0xf8f8f8);
        //        scene.fog = new Three.Fog(0xa0a0a0, 1, 10);

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

        /* var axesHelper = new Three.AxesHelper(5);
	 * scene.add(axesHelper);
	 */

        let camera = getCamera(width, height);
        let distance = 1.2
        //camera.position.set(- distance * 2, distance + 0.5, 0.5);

        //camera.rotateY(Math.PI / 2);
        //camera.lookAt(-0.5, 0.25, 0.5);

        camera.up.set(0, 0, 1);
        let back = -2
        camera.position.set(back, back, -1 * back);

        //camera.rotateX(Math.PI / 2);
        camera.lookAt(1, 1, 0.5);

        const render_scene = () => {
            renderer.render(scene, camera);
        };

        const add_mesh = (mesh: Three.Mesh) => {
            scene.add(mesh);
            render_scene();
        };

        const remove_mesh = (n: string) => {
            let m = scene.getObjectByName(n);
            if (m) {
                scene.remove(m);
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

        render_scene();
        controls.current = {
            add_mesh,
            remove_mesh
        } as VisualizerControls;

    }, []);

    useEffect(() => {
        if (palletConfig && current_box && palletConfig !== null && controls.current) {

            let frameDims = parseConfig(palletConfig);
            let frameNorm = FrameNorm(frameDims);
            let newPalletNames = [] as string[];

            palletNames.forEach((pn: string) => {
                controls.current?.remove_mesh(pn);
            });

            palletConfig.config.pallets.forEach((p: PalletGeometry, palletIndex: number) => {

                let { width, length } = getPalletDimensions(p);
                let height = 5;

                width /= frameNorm;
                height /= frameNorm;
                length /= frameNorm;

                const pallet_center = getCenterOfPallet(p);
                let { x, y, z } = pallet_center;

                x /= frameNorm;
                y /= frameNorm;
                z /= frameNorm;
                z = -1 * height;

                let palletName = "PALLET-" + String(palletIndex);
                newPalletNames.push(palletName);

                GetPalletMesh(width, length, height, (palletMesh: Three.Mesh, fheight: number) => {
                    z = -fheight / 2;
                    palletMesh.position.set(x, y, z);
                    palletMesh.name = palletName;
                    controls.current?.add_mesh(palletMesh);
                });
            });

            setPalletNames([...newPalletNames]);

            const getPalletHeight = (p: PalletGeometry) => {
                let { corner1, corner2, corner3 } = p;
                let z1 = corner1.z;
                let z2 = corner2.z;
                let z3 = corner3.z;
                return (z1 + z2 + z3) / 3;
            };

            let newBoxNames = [] as string[];

            boxNames.forEach((bn: string) => {
                controls.current?.remove_mesh(bn);
            });

            const boxCoordinates = palletConfig.boxCoordinates.sort((a: BoxCoordinates, b: BoxCoordinates) => {
                return b.linearPathDistance - a.linearPathDistance;
            });

            boxCoordinates.filter((_: BoxCoordinates, i: number) => {
                return i < current_box;
            }).forEach((b: BoxCoordinates, i: number) => {
                const BoxName = "BOXNAME-" + String(i);
                const { dropLocation, dimensions, palletIndex } = b;
                const pallet = palletConfig.config.pallets[palletIndex];

                const first_layout_height = pallet.Layouts[pallet.Stack[0]].height;
                const palletHeight = getPalletHeight(pallet);
                const φ_pallet = getXAxisAngle(Subtract3D(pallet.corner3, pallet.corner2));
                const angle = (dropLocation.θ - φ_pallet) * Math.PI / 180;
                console.log(first_layout_height);

                let { width, height, length } = dimensions;

                width /= frameNorm;
                height /= frameNorm;
                length /= frameNorm;

                let box = getCardboardBox(width, height, length);

                box.name = BoxName;
                newBoxNames.push(BoxName);

                let { x, y, z } = Subtract3D(dropLocation, pallet.corner2);

                let delta_z = palletHeight - dropLocation.z;

                delta_z /= frameNorm;
                x /= frameNorm;
                y /= frameNorm;
                z = 0;
                z += delta_z - height / 2 + first_layout_height / frameNorm; // Add the height of the first layer -- to get top of box.
                box.position.set(x, y, z);

                box.rotateZ(angle);
                controls.current?.add_mesh(box);
            });

            setBoxNames([...newBoxNames]);
        }
    }, [palletConfig]);

    return (<div className="Visualizer" ref={mount} />);
};

import React, { useEffect, useRef, useState, useContext } from 'react';


// 3D rendering
import * as Three from "three";

// Context
import {PalletizerContext} from "../context/PalletizerContext";
import {ConfigContext} from "../context/ConfigContext";

// Requests
import {get_config} from "../requests/requests";

// Types
import {ConfigState} from "../types/Types";

// Styles.
import "./css/Visualizer.scss";

// Images.
import wood from "./images/wood.jpg";
import carboard from "./images/cardboard.jpg";
import vcardboard from "./images/vcardboard.jpg";

// Cleanup this file once it is functional!

interface PalletGeometry {
    pallet_height : number;
    pallet_width : number;
    pallet_length : number;
    box_height : number;
    box_width : number;
    box_length : number;
    width_count : number;
    length_count : number;
    height_count : number;
    norm: number;
    shift_x : number;
    shift_y : number;
    shift_z : number;
    x : string;
    y : string;
    z : string;
}


function parse_config(config : any) : PalletGeometry {
    let box_size = config["BOX_SIZE"] as any;
    let pallet_rows = config["PALLET_ROWS"] as any;
    let pallet_cols = config["PALLET_COLUMNS"] as any;
    let pallet_lays = config["PALLET_LAYERS"] as any;

    let x = pallet_rows["DIRECTION"] as string;
    let y = pallet_cols["DIRECTION"] as string;
    let z = pallet_lays["DIRECTION"] as string;
    
    let width_count = pallet_rows["COUNT"] as number;
    let length_count = pallet_cols["COUNT"] as number;
    let height_count = pallet_lays["COUNT"] as number;


    let box_width = box_size[x] as number;
    let box_length = box_size[y] as number;
    let box_height = box_size[z] as number;

    let width = width_count * box_width;
    let length = length_count * box_length;
    let height = width/25; // not too small, approximately fixed.
    let norm = Math.sqrt(width ** 2 + length ** 2 + height ** 2);

    let pallet_origin = config["PALLET_ORIGIN"];
    let shift_x = pallet_origin[x] as number;
    let shift_y = pallet_origin[y] as number;
    let shift_z = pallet_origin[z] as number;

    let geometry = {
        pallet_height : height/norm,
        pallet_width : width/norm,
        pallet_length : length/norm,
        box_length : box_length/norm,
        box_height : box_height/norm,
        box_width : box_width/norm,
        width_count : width_count,
        height_count : height_count,
        length_count : length_count,
        norm,
        shift_x,
        shift_y,
        shift_z,
        x,
        y,
        z
    } as PalletGeometry;

    return geometry;
}

function get_camera(width: number, height: number) : Three.PerspectiveCamera {
    let camera = new Three.PerspectiveCamera(45, width/height, 1, 1000);
    camera.position.set(0, 1.2, 1.2);
    // camera.position.set(0, 2, 2);
    camera.lookAt(0, 0, 0);
    return camera;
}

function get_scene() : Three.Scene {
    let scene = new Three.Scene();
    scene = new Three.Scene();
    scene.background = new Three.Color( 0xa0a0a0 );
    scene.fog = new Three.Fog( 0xa0a0a0, 1, 4);

    let hemiLight = new Three.HemisphereLight( 0xffffff, 0x444444 );
    hemiLight.position.set( 0, 20, 0 );
    scene.add( hemiLight );

    let dirLight = new Three.DirectionalLight( 0xffffff );
    dirLight.position.set( 0, 1, 1 );
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = - 10;
    dirLight.shadow.camera.left = - 10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 40;
    scene.add( dirLight );

    // ground
    var groundMesh = new Three.Mesh(
        new Three.PlaneBufferGeometry( 40, 40 ),
        new Three.MeshPhongMaterial( {
            color: 0x999999,
            depthWrite: false
        } )
    );

    groundMesh.rotation.x = - Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add( groundMesh );
    return scene;
}


function get_green_cardboard_box(width: number, height: number, length: number) : Three.Mesh {
    let box = get_cardboard_box(width, height, length);
    (box.material as Three.Material[]).forEach((mat : Three.Material)=>{
        let m = mat as Three.MeshBasicMaterial;
        m.color.setRGB(0, 1, 0);
    });
    return box;
}


function get_cardboard_box(width: number, height: number, length: number) : Three.Mesh {
    
    let loader = new Three.TextureLoader();
    let texture = loader.load(carboard);
    let vtexture = loader.load(vcardboard);
    let material = new Three.MeshBasicMaterial({map: texture});
    let vmaterial = new Three.MeshBasicMaterial({map: vtexture});
    let textures = [] as Three.MeshBasicMaterial[];

    for (let i=0; i<6; i++){
        if (i === 4){
            textures.push(vmaterial);
        }else{
            textures.push(material);
        }
    }
    let geometry = new Three.BoxGeometry(width, height, length);
    let box = new Three.Mesh(geometry, textures);

    return box;
} 

interface Coordinate { // To allow for angle.
    x : number;
    y : number;
    z : number;
}

interface VisualizerControls {
    add_box() : ()=>void;
    add_boxes(current_box : number) : void;
    add_mesh(mesh : Three.Mesh) : void;
    set_cardboard_box(g : PalletGeometry) : void;
}


function translate_box_coordinates(c: Coordinate[], g : PalletGeometry) : Coordinate[] {
    let {
        norm,
        shift_x,
        shift_y,
        shift_z,
        x,
        y,
        z,
        pallet_width,
        pallet_length,
        box_height
    } = g;

    
    c.forEach((v : Coordinate)=>{
        (v as any)[x] -= shift_x + pallet_width * norm/2;
        (v as any)[y] -= shift_y + pallet_length * norm/2;
        (v as any)[z] -= shift_z + box_height *norm/2; // Pallet coordinates are at the top of the box.
        (v as any)[x] /= norm;
        (v as any)[y] /= norm;
        (v as any)[z] /= norm;
    });

    return c;
}

function get_box_name(box_number : number) : string {
    return "Box-" + String(box_number);
}

// Set the scene.
function Visualizer(){
    let mount = useRef<HTMLDivElement>(null);
    
    let palletizer_context = useContext(PalletizerContext);
    let config_context = useContext(ConfigContext);
    
    let {current_box, coordinates, status} = palletizer_context;
    let {configurations, current_index} = config_context as ConfigState; 

    let controls = useRef<VisualizerControls | null>(null);

    let geometry = useRef<PalletGeometry|null>(null);
    let box_positions = useRef<Coordinate[]|null>(null);

  
    useEffect(() => {

        let width = (mount.current as HTMLDivElement).clientWidth;
        let height =  (mount.current as HTMLDivElement).clientHeight;

        let renderer = new Three.WebGLRenderer({ antialias: true });
        renderer.setClearColor('white');
        renderer.setSize(width, height);
        
        let scene = get_scene();
        let camera = get_camera(width, height);


        let render_scene = () => {
            renderer.render(scene, camera);
        };

        let add_mesh = (mesh : Three.Mesh) => {
            scene.add(mesh);
            render_scene();
        };
        
        let axes_helper = new Three.AxesHelper(1);
        scene.add(axes_helper);

        let current_box_count = 0;
        let cardboard_box : Three.Mesh;
        let green_box : Three.Mesh;

        let set_cardboard_box = (g : PalletGeometry) => {
            let {box_width, box_length, box_height} = g;
            cardboard_box = get_cardboard_box(box_width, box_height, box_length);
            green_box = get_green_cardboard_box(box_width, box_height, box_length);
        };

        let add_box = ({x,y,z} : Coordinate, box_number: number) => {
            let new_box : Three.Mesh;
            if (box_number === current_box_count+1){
                new_box = green_box.clone();
            }else{
                new_box = cardboard_box.clone();
            }
            let box_name = get_box_name(current_box_count);
            new_box.name = box_name;
            new_box.position.set(x,z,y); // swap around coordinates.
            add_mesh(new_box);
            current_box_count++;
        };

        let remove_box = (box_number: number) => {
            let box_name = get_box_name(box_number);
            let box = scene.getObjectByName(box_name);
            if (box) {
                scene.remove(box);
                current_box_count--;
            }
        };

        let decolor_box = (box_number : number) => {
            let box_name = get_box_name(box_number - 1);
            let box = scene.getObjectByName(box_name);
            if (box) {
                let position = box.position;
                let new_box = cardboard_box.clone();
                new_box.name = box_name;
                new_box.position.set(position.x, position.y, position.z);
                scene.remove(box);
                scene.add(new_box);
            }
        }

        let add_boxes = (box_number : number) => {
            if (box_positions.current) {
                let positions = box_positions.current as Coordinate[];
                while (current_box_count > box_number) {
                    remove_box(current_box_count - 1);
                    render_scene();
                }
                if (current_box_count < box_number) {
                    while (current_box_count < box_number) {
                        add_box(positions[current_box_count], box_number);
                    }
                    decolor_box(current_box_count - 1);
                    render_scene();
                }
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

        controls.current = {
            add_box,
            add_boxes,
            add_mesh,
            set_cardboard_box,
        } as VisualizerControls;
    }, []);

    // current index is configuration file index.
    useEffect(()=>{
        
        if (current_index != null && configurations.length > current_index){
            let consume_config = async () => {
                let res_data = await get_config(configurations[current_index as number]) as any;

                let g = parse_config(res_data) as PalletGeometry;
                
                geometry.current = g;

                controls.current?.set_cardboard_box(g);
                
                let {pallet_length, pallet_width, pallet_height} = g;

                let loader = new Three.TextureLoader();

                loader.load(wood, (t: Three.Texture)=>{
                    let g = new Three.BoxGeometry(pallet_width, pallet_height, pallet_length);
                    let m = new Three.MeshBasicMaterial({ map : t });
                    let pallet = new Three.Mesh(g, m);
                    pallet.position.set(0, -(pallet_height / 2), 0); // Move pallet down (to allow box to meet pallet at y=0)
                    controls.current?.add_mesh(pallet);
                });
            };
            
            consume_config();
        }

    },[current_index]);

    useEffect(()=>{
        if (coordinates && geometry.current && coordinates.length > 0){
            box_positions.current = translate_box_coordinates(coordinates as Coordinate[], geometry.current);
        }       
    }, [coordinates]);
     
    // Populate boxes when the box number increases.
    useEffect(()=>{
        if (coordinates != null && current_box != null) {
            controls.current?.add_boxes(current_box as number);
        }
            
    }, [current_box]);

    useEffect(()=>{
        console.log("statis", status);
        if (status === "Complete"){
            console.log("Should decolor the last box");
            // controls.current?.decolor_last();
        }
    }, [status]);



    // Temporary function.
  
    return (<div className="Visualizer" ref={mount} />);
}
export default Visualizer;


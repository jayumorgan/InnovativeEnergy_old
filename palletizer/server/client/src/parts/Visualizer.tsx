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
}


function parse_config(config : any) : PalletGeometry {
    let box_size = config["BOX_SIZE"] as any;
    let pallet_rows = config["PALLET_ROWS"] as any;
    let pallet_cols = config["PALLET_COLUMNS"] as any;
    let pallet_lays = config["PALLET_LAYERS"] as any;

    let width_count = pallet_rows["COUNT"] as number;
    let length_count = pallet_cols["COUNT"] as number;
    let height_count = pallet_lays["COUNT"] as number;

    let row_direction = pallet_rows["DIRECTION"] as string;
    let col_direction = pallet_cols["DIRECTION"] as string;
    let lay_direction = pallet_lays["DIRECTION"] as string;

    let box_width = box_size[row_direction] as number;
    let box_length = box_size[col_direction] as number;
    let box_height = box_size[lay_direction] as number;

    let width = width_count * box_width;
    let length = length_count * box_length;
    let height = width/25; // not too small, approximately fixed.
    let norm = Math.sqrt(width ** 2 + length ** 2 + height ** 2);

    let geometry = {
        pallet_height : height/norm,
        pallet_width : width/norm,
        pallet_length : length/norm,
        box_length : box_length/norm,
        box_height : box_height/norm,
        box_width : box_width/norm,
        width_count : width_count,
        height_count : height_count,
        length_count : length_count
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



interface VisualizerControls {
    add_box() : ()=>void;
    add_boxes(current_box : number) : void;
    add_mesh(mesh : Three.Mesh) : void;
    set_cardboard_box(g : PalletGeometry) : void;
}



// Set the scene.
function Visualizer(){
    let mount = useRef<HTMLDivElement>(null);
    
    let palletizer_context = useContext(PalletizerContext);
    let config_context = useContext(ConfigContext);
    
    let {current_box} = palletizer_context;
    let {configurations, current_index} = config_context as ConfigState; 

    let controls = useRef<VisualizerControls | null>(null);

  
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
        }

        let add_mesh = (mesh : Three.Mesh) => {
            scene.add(mesh);
            render_scene();
        }
        
        let axes_helper = new Three.AxesHelper(1);
        scene.add(axes_helper);

        let geometry : PalletGeometry;

        // render_scene();

        let [h, w, l] = [0.1, 4, 3];
        let norm = Math.sqrt(w ** 2 + h ** 2 + l ** 2);

        let [ch, cw, cl] = [1,1,1];
        let start_z =  (h + ch) / (2 * norm);  
        let start_x = -1 * w/(2 * norm) + cw/(2*norm); // negative width of box / 2 + 
        let start_y = -1 * l/(2 * norm) + cl/(2*norm);

        
        let box_z =  start_z; 
        let box_x =  start_x;
        let box_y =  start_y;

        let x_shift = cw/(norm);
        let y_shift = cl/(norm);
        let z_shift = ch/(norm);
        let shift_index = 0;

        let sign = 1;
        let current_box_count = 0;

        let next_position = () : [number,number,number] => {
            let next = [box_x, box_y, box_z] as [number, number, number];
            shift_index++;
            if (shift_index % 4 === 0 && shift_index !== 0) {
                box_y += y_shift;
                box_x = start_x;
            } else {
                box_x += x_shift * sign;
            }
            if (shift_index % 12 === 0){
                box_z += z_shift;
                box_x = start_x;
                box_y = start_y;
                sign = 1;
            } 
            return next;
        };

        let cardboard_box : Three.Mesh;

        let set_cardboard_box = (g : PalletGeometry) => {
            console.log("Setting cardboard box..,", g);
            let {box_width, box_length, box_height} = g;
            cardboard_box = get_cardboard_box(box_width, box_height, box_length);
        }


        let add_box = () => {
            current_box_count++;
            
            let new_box = cardboard_box.clone();
            new_box.name = "Box-"+String(current_box_count);
            console.log(new_box.name);
            
            let [x,y,z] = next_position(); 

            new_box.position.set(x,z,y); // swap around coordinates.
            add_mesh(new_box);
        };

        let remove_box = (box_number: number) => {
            let box = scene.getObjectByName("Box-"+String(box_number));
            if (box) {
                scene.remove(box);
                current_box_count--;
                render_scene();
            }
        }

        let add_boxes = (box_number : number) => {
            if (current_box_count <= box_number) {
                while (current_box_count < box_number){
                    add_box();
                }
            } else {
                while (current_box_count > box_number){
                    remove_box(current_box_count)
                }
            }
        }
        
        let handleResize = () => {
            if (mount.current) {
                width = (mount.current as HTMLDivElement).clientWidth;
                height = (mount.current as HTMLDivElement).clientHeight;
                renderer.setSize(width, height);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                render_scene();
            }
        }

        (mount.current as HTMLDivElement).appendChild(renderer.domElement);
        window.addEventListener('resize', handleResize);

        controls.current = {add_box, add_boxes, add_mesh, set_cardboard_box} as VisualizerControls;
    }, []);

    useEffect(()=>{
        if (current_index != null && configurations.length > current_index){
            let consume_config = async () => {

                let res_data = await get_config(configurations[current_index as number]) as any;

                let geometry = parse_config(res_data) as PalletGeometry;

                controls.current?.set_cardboard_box(geometry);

                let {pallet_length, pallet_width, pallet_height} = geometry;

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

    // Populate boxes when the box number increases.
    useEffect(()=>{
        controls.current?.add_boxes(current_box as number);
    }, [current_box]);


    // Temporary function.
    let handle_click = ()=>{
        controls.current?.add_box();
    };
  
    return (<div className="Visualizer" ref={mount} onClick={handle_click} />);
}
export default Visualizer;


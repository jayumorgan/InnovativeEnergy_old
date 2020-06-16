import React, { useEffect, useRef, useState, useContext } from 'react';

import * as Three from "three";

import {PalletizerContext} from "../context/PalletizerContext";

// Styles.
import "./css/Visualizer.scss";

// Images.
import wood from "./images/wood.jpg";
import carboard from "./images/cardboard.jpg";
import vcardboard from "./images/vcardboard.jpg";


function Visualizer(){
    const mount = useRef<HTMLDivElement>(null);
    let palletizer_context = useContext(PalletizerContext);
    let {current_box} = palletizer_context;
    // const [isAnimating, setAnimating] = useState(false);
    const controls = useRef<any>(null);
    let renderScene : any;
  
    useEffect(() => {

        let width = (mount.current as HTMLDivElement).clientWidth;
        let height =  (mount.current as HTMLDivElement).clientHeight;

        const scene = new Three.Scene();
        // let camera = new Three.PerspectiveCamera()
        const camera = new Three.PerspectiveCamera(75, width / height, 0.1, 1000);
        const renderer = new Three.WebGLRenderer({ antialias: true });
        let axes_helper = new Three.AxesHelper(1);
        scene.add(axes_helper);

        renderScene = ()=>{
            renderer.render(scene, camera);
        }


        let loader = new Three.TextureLoader();

        camera.rotateY(Math.PI/4);

        let [h, w, l] = [0.1, 4, 3];
        let norm = Math.sqrt(w ** 2 + h ** 2 + l ** 2)

        let dist = 1.1 / Math.sqrt(2)

        camera.position.z = dist;
        camera.position.y = 0.4;
        camera.position.x = dist;

        // Setup the palletizer.
        loader.load(wood, (t: Three.Texture)=>{
            
            let geometry = new Three.BoxGeometry(w/norm, h/norm, l/norm);
            let material = new Three.MeshBasicMaterial({ map : t });
            let cube = new Three.Mesh(geometry, material);

            scene.add(cube);
            renderer.setClearColor('white');
            renderer.setSize(width, height);
            renderer.render(scene, camera);
            
        });

        let light = new Three.PointLight(0xffffff,100, 100);
        light.position.set( 0.5, 0.5, 0 );
        scene.add( light );

        // Setup for the cardboard boxes.

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
                // sign *= -1;
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


        
        // Color the last box Green, Yellow or Red depending on system state.
        // Consider adding a floor to the display. (concrete?)
        let cardboard_box = (()=>{
            let texture = loader.load(carboard);
            let vtexture = loader.load(vcardboard);
            let material = new Three.MeshBasicMaterial({map: texture});
            let vmaterial = new Three.MeshBasicMaterial({map: vtexture});
            let textures = [] as Three.MeshBasicMaterial[];
            // vmaterial.color = new Three.Color("red");

            for (let i=0; i<6; i++){
                if (i === 4){
                    textures.push(vmaterial);
                }else{
                    textures.push(material);
                }
            }



            
            let geometry = new Three.BoxGeometry(cw/norm, ch/norm, cl/norm);
            let box = new Three.Mesh(geometry, textures);
            
            return box;
        })();
        
        let add_box = () => {
            current_box_count++;
            
            let new_box = cardboard_box.clone();

            new_box.name = "Box-"+String(current_box_count);
            console.log(new_box.name);
            
            let [x,y,z] = next_position(); 

            new_box.position.set(x,z,y); // swap around coordinates.
            scene.add(new_box);
            renderScene();
        };

        let add_boxes = (box_number : number) => {
            if (current_box_count <= box_number) {
                while (current_box_count < box_number){
                    add_box();
                }
            }
        }
        
        let handleResize = () => {
            width = (mount.current as HTMLDivElement).clientWidth;
            height = (mount.current as HTMLDivElement).clientHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderScene();
        }


        (mount.current as HTMLDivElement).appendChild(renderer.domElement)
        window.addEventListener('resize', handleResize)
        controls.current = {add_box, add_boxes} ;
    }, []);

    let handle_click = ()=>{
        controls.current.add_box();
        
    };

    useEffect(()=>{
        // controls.current.add_box();
        controls.current.add_boxes(current_box);
    }, [current_box]);
  
    return (<div className="Visualizer" ref={mount} onClick={handle_click} />);
}
export default Visualizer;


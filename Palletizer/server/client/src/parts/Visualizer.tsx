import React, { useEffect, useRef, useState, useContext } from 'react';

import * as Three from "three";

import {PalletizerContext} from "../context/PalletizerContext";

// Styles.
import "./css/Visualizer.scss";
import wood from "./images/wood.jpg";
import carboard from "./images/cardboard.jpg";


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
        let frameId : any;

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

        // camera.rotateX(-0.1);
        
        // camera.rotateY(Math.PI / 4);
        // camera.rotateY(Math.PI/4);
        // camera.rotateZ(Math.PI/4);
        // camera.rotateX(-Math.PI/8);
        camera.rotateY(Math.PI/4);
        
        // camera.position.x = 1;

        let [h, w, l] = [0.1, 4, 3];
        let norm = Math.sqrt(w ** 2 + h ** 2 + l ** 2)
        // camera.position.z = 1.1 * l/norm;
        // camera.position.x = 1.1 * l/norm;
        camera.position.z = 0.6;
        camera.position.y = 0.2;
        camera.position.x = 0.6;
        // camera.rotateY(Math.PI/4);

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

        let cardboard_box = (()=>{
            let texture = loader.load(carboard);
            let geometry = new Three.BoxGeometry(cw/norm, ch/norm, cl/norm);
            let material = new Three.MeshBasicMaterial({map: texture});
            let box = new Three.Mesh(geometry, material);
            
            return box;
        })();
        
        let add_box = () => {
            let new_box = cardboard_box.clone();
            let [x,y,z] = next_position(); 
            console.log(x,z,y);
            new_box.position.set(x,z,y); // because strange coordinates.
            scene.add(new_box);
            current_box_count++;
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

        const animate = () => {
            // cube.rotation.x += 0.01
            // cube.rotation.y += 0.01

            // renderScene()
            // frameId = window.requestAnimationFrame(animate)
        }

        const start = () => {
            if (!frameId) {
                frameId = requestAnimationFrame(animate)
            }
        }

        const stop = () => {
            cancelAnimationFrame(frameId)
            frameId = null
        }

        (mount.current as HTMLDivElement).appendChild(renderer.domElement)
        window.addEventListener('resize', handleResize)
        // start()

        // controls.current = { start, stop };
        controls.current = {add_box, add_boxes} ;
        // renderScene();

        // return () => {
        //     stop();
        //     (window as any).removeEventListener('resize', handleResize)
        //     (mount.current as HTMLDivElement).removeChild(renderer.domElement)

        //     scene.remove(cube)
        //     // geometry.dispose()
        //     // material.dispose()
        // }
    }, []);

    let handle_click = ()=>{
        controls.current.add_box();
        
    };

    useEffect(()=>{
        // controls.current.add_box();
        controls.current.add_boxes(current_box);
    }, [current_box]);
  // useEffect(() => {
  //     // renderScene();
  //     console.log("Adding a box");
  //     controls.current.add_box();
    
  //   // if (isAnimating) {
  //   //   controls.current.start()
  //   // } else {
  //   //   controls.current.stop()
  //   // }
  // }, [isAnimating])
  
  return <div className="Visualizer" ref={mount} onClick={handle_click} />
}
export default Visualizer;


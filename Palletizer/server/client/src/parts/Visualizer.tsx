import React, { useEffect, useRef, useState } from 'react';

import * as Three from "three";


// Styles.
import "./css/Visualizer.scss";
import wood from "./images/wood.jpg";
import carboard from "./images/cardboard.jpg";



function Visualizer(){
    const mount = useRef<HTMLDivElement>(null);
    const [isAnimating, setAnimating] = useState(false);
    const controls = useRef<any>(null);
    let renderScene : any;
  
    useEffect(() => {

        let width = (mount.current as HTMLDivElement).clientWidth;
        let height =  (mount.current as HTMLDivElement).clientHeight;
        let frameId : any;

        const scene = new Three.Scene();
        const camera = new Three.PerspectiveCamera(75, width / height, 0.1, 1000);
        const renderer = new Three.WebGLRenderer({ antialias: true });

        renderScene = ()=>{
            renderer.render(scene, camera);
        }


        let loader = new Three.TextureLoader();

        camera.position.z = 1;

        let [h, w, l] = [0.8, 12, 12];
        let norm = Math.sqrt(w ** 2 + h ** 2 + l ** 2)

        let set_rotation = (obj: Three.Mesh)=>{
            obj.rotateX(0.3);
            // obj.rotateY(0.8);
        };


        // Setup the palletizer.
        loader.load(wood, (t: Three.Texture)=>{
            
            let geometry = new Three.BoxGeometry(w/norm, h/norm, l/norm);
            let material = new Three.MeshBasicMaterial({ map : t });
            let cube = new Three.Mesh(geometry, material);
            set_rotation(cube);

            scene.add(cube);
            renderer.setClearColor('white');
            renderer.setSize(width, height);
            renderer.render(scene, camera);
            
        });

        let [ch, cw, cl] = [3,3,3];

        let box_height = 0 + h/norm + 0.1; // The last 0.1 corresponds to sine(x_ange) * length of box.
        let cardboard_box = (()=>{
            let texture = loader.load(carboard);
            // let v_texture = loader.load()
            let geometry = new Three.BoxGeometry(cw/norm, ch/norm, cl/norm);
            let material = new Three.MeshBasicMaterial({map: texture});
            let box = new Three.Mesh(geometry, material);
            set_rotation(box);
            
            return box;
        })();
        
        let add_box = () => {
            let new_box = cardboard_box.clone();
            new_box.position.y = box_height;
            box_height += ch/norm;
            console.log("Box height")
            scene.add(new_box);
            renderScene();
        };
        
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
        controls.current = {add_box};
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


import React from 'react';
 
// Ace Editor
import AceEditor, { IAceEditorProps } from "react-ace";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-xcode";

// Styles
import "./css/Modal.scss";

function Modal(props: any) {
    return (
        <div className="Modal">
            <div className="ModalContent">
                {props.children}
            </div>
        </div>
    );
}

interface EditorProps {
    file_name : string;
    title : string;
    close_editor(): any
}


function Editor({file_name, title, close_editor} : EditorProps) {
    
    let handle_edit = (value:string) => {
        // console.log(value);
    }

    let modal_title = "Edit " + title.toLowerCase() + ": " + file_name;
    
    let editor_settings = {
        mode: "json",
        theme: "xcode",
        onChange: handle_edit,
        name: "AceEditor"
    } as IAceEditorProps;
    
    return (
        <Modal>
            <span id="EditorTitle">
                {modal_title}
            </span>
            <AceEditor {...editor_settings} /> 
            <div className="EditorFooter">
                <div className="CloseEditor">
                    <span>
                        {"Close"}
                    </span>
                </div>
                <div className="SaveEditor">
                    <span>
                        {"Save"}
                    </span>
                </div>
            </div>
        </Modal>
    );
}


export {Editor};


export default Modal;

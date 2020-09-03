import React, { ReactNode, useEffect, useState, useRef } from 'react';


import { get_config } from "../requests/requests";

// Styles
import "./css/Modal.scss";

interface ModalProps {
    children: ReactNode;
    close(): any;
}


export default function Modal({ children, close }: ModalProps) {

    let modal_class: string = "Modal";

    let close_modal = (e: React.MouseEvent<HTMLElement>) => {
        let target = e.target as HTMLElement;
        if (target.className === modal_class) {
            close();
        }
    };

    return (
        <div className={modal_class} onClick={close_modal}>
            {children}
        </div>
    );
}


interface UnlockProps {
    close(): void;
}


function UnlockItem(props: any) {
    return (
        <div className="UnlockItem">
            {props.children}
        </div>
    )
}

export function Unlock({ close }: UnlockProps) {
    let [valid, set_valid] = useState<boolean>(false);

    let password = "123123";

    let handle_input = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value === password) {
            set_valid(true);
        } else {
            set_valid(false);
        }
    };

    let handle_close = () => {
        valid && close();
    };

    return (
        <Modal close={handle_close} >
            <div className="Unlock">
                <UnlockItem>
                    <span id="UnlockTitle">
                        {"Enter password to unlock"}
                    </span>
                </UnlockItem>
                <UnlockItem>
                    <input type="password" id="unlock" onChange={handle_input} />
                </UnlockItem>
                <UnlockItem>
                    <div className={"UnlockButton" + (valid ? "" : "Locked")} onClick={handle_close}>
                        <span>
                            Unlock
                        </span>
                    </div>
                </UnlockItem>
            </div>
        </Modal>
    );
};


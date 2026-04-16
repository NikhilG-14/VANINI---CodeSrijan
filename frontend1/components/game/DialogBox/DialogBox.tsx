'use client';

// Components
import MessageBox from '../MessageBox';

// Styles
import styles from './DialogBox.module.scss';

interface DialogBoxProps {
    show?: boolean;
}

function DialogBox({ show = false }: DialogBoxProps) {
    return (
        <MessageBox
            dialogWindowClassname={styles.dialogWindow}
            dialogFooterClassname={styles.dialogFooter}
            dialogTitleClassname={styles.dialogTitle}
            show={show}
            showNext
        />
    );
}

export default DialogBox;

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { ObjectMenuContainer } from "./ObjectMenuContainer";
import { useTeacherRole } from "./hooks/useTeacherRole";

/**
 * Wrapper for ObjectMenuContainer that hides the menu when 
 * the student's view is locked by the teacher sharing content.
 */
export function FocusLockAwareObjectMenu(props) {
    const { isTeacher } = useTeacherRole();
    const [isFocusLocked, setIsFocusLocked] = useState(false);

    // Check the global focus lock state
    useEffect(() => {
        const checkFocusLock = () => {
            setIsFocusLocked(!!window.APP?.isFocusLocked);
        };

        // Check immediately
        checkFocusLock();

        // Poll for changes since it's a global variable
        const interval = setInterval(checkFocusLock, 100);

        return () => clearInterval(interval);
    }, []);

    // Hide object menu for non-teachers when focus is locked
    if (!isTeacher && isFocusLocked) {
        return null;
    }

    return <ObjectMenuContainer {...props} />;
}

FocusLockAwareObjectMenu.propTypes = {
    hubChannel: PropTypes.object.isRequired,
    scene: PropTypes.object.isRequired,
    onOpenProfile: PropTypes.func.isRequired,
    onGoToObject: PropTypes.func.isRequired
};

export default FocusLockAwareObjectMenu;

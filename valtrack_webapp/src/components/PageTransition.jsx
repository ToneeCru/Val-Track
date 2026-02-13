import React from 'react';
import { motion } from 'framer-motion';

const PageTransition = ({ children }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
                duration: 0.2,
                ease: [0.25, 1, 0.5, 1] // Custom cubic-bezier for a more "professional" feel
            }}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;

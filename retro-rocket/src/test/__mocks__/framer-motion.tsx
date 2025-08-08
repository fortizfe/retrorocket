// Mock Framer Motion components
export const motion = {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
    main: ({ children, ...props }: any) => <main {...props}>{children}</main>,
    article: ({ children, ...props }: any) => <article {...props}>{children}</article>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    ul: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
    input: ({ children, ...props }: any) => <input {...props}>{children}</input>,
    textarea: ({ children, ...props }: any) => <textarea {...props}>{children}</textarea>,
};

export const AnimatePresence = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const useAnimation = () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
});

export const useMotionValue = (initial: any) => ({
    get: () => initial,
    set: jest.fn(),
    on: jest.fn(),
});

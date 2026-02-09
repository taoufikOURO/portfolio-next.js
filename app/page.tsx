import About from "./components/About";
import Contact from "./components/Contact";
import Hero from "./components/Hero";
import Projects from "./components/Projects";
import Stack from "./components/Stack";

export default function Home() {
    return (
        <>
            <Hero />
            <About />
            <Stack />
            <Projects />
            <Contact />
        </>
    );
}

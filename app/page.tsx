import About from "./components/About";
import Contact from "./components/Contact";
import Formations from "./components/Formations";
import Hero from "./components/Hero";
import Projects from "./components/Projects";
import Stack from "./components/Stack";

export default function Home() {
    return (
        <>
            <Hero />
            <About />
            <Stack />
            <Formations />
            <Projects />
            <Contact />
        </>
    );
}

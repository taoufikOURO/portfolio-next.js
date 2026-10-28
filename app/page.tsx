import About from "./components/About";
import Articles from "./components/Articles";
import Contact from "./components/Contact";
import Formations from "./components/Formations";
import Hero from "./components/Hero";
import Projects from "./components/Projects";
import Stack from "./components/Stack";

export default function Home() {
    return (
        <main className="home">
            <Hero />
            <About />
            <Stack />
            <Formations />
            <Projects />
            <Articles />
            <Contact />
        </main>
    );
}

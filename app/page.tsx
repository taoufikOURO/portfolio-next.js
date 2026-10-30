import { getFaq, getServices } from "./lib/data";
import About from "./components/About";
import Articles from "./components/Articles";
import Contact from "./components/Contact";
import Expertise from "./components/Expertise";
import Faq from "./components/Faq";
import Formations from "./components/Formations";
import Hero from "./components/Hero";
import Projects from "./components/Projects";
import Stack from "./components/Stack";

export default function Home() {
    return (
        <main id="contenu">
            <Hero />
            <Expertise services={getServices()} />
            <About />
            <Projects />
            <Formations />
            <Stack />
            <Articles />
            <Faq items={getFaq()} />
            <Contact />
        </main>
    );
}

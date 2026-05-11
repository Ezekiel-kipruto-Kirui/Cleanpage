import * as React from 'react';
import { useState, useEffect } from 'react';
import "bootstrap-icons/font/bootstrap-icons.css";
import { ROUTES } from "@/services/Routes";



export default function LaundryLanding() {
  // --- State for Hero Slider ---
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTextVisible, setIsTextVisible] = useState(true);

  const heroSlides = [
    {
      heading: "Your clothes deserve expert care, freshness, and a gentle touch.",
      subtext: "Carefully washed, expertly cleaned, and perfectly finished every time."
    },
    {
      heading: "Freshness You Can See. Care You Can Trust.",
      subtext: "Delivering spotless results with attention to every detail."
    },
    {
      heading: "Free Pickup & Delivery, Same day Service on all Clothes",
      subtext: "Convenient, fast, and reliable service designed around your schedule"
    }
  ];

  // Hero Slider Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTextVisible(false); // Fade out
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
        setIsTextVisible(true); // Fade in
      }, 1000); // Wait for fade out to finish
    }, 8000); // Total cycle time

    return () => clearInterval(interval);
  }, []);

  // --- State for Testimonial Carousel ---
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const testimonials = [
    {
      title: "Clothes Cleaning Transformation",
      desc: "Clothes transformed from dirty to fresh and vibrant. Stains removed and fabric revitalized for a like-new look.",
      beforeImg: "./dirtyclothes.png",
      afterImg: "./cleanclothes.jpg",

    },
    {
      title: "Shoes Restored to Perfection",
      desc: "Transform your shoes with our expert services. Sneaker cleaning, leather polishing, and stain removal. Step out fresh and spotless every day!",
      beforeImg: "./dirtshoes.png",
      afterImg: "./new-sneakers.jpg",

    },

    {
      title: "Bedding Cleaning Transformation",
      desc: "Bedding cleaned from dust, stains, and odors to provide a hygienic and comfortable sleeping surface.",
      beforeImg: "./dirtybeddings.png",
      afterImg: "./cleanbeddings.png",

    }
  ];

  // --- Mobile Menu State ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Form Submission State ---
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    // Simulate form submission
    setFormSubmitted(true);
    setTimeout(() => setFormSubmitted(false), 5000); // Hide message after 5 seconds
  };

  return (
    <div className="font-sans text-gray-700 bg-white">
      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md transition-all duration-300">
        <div className="container-fluid container-xl mx-auto px-4 h-20 flex items-center justify-around">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3">
            {/* Using a generic laundry icon since local asset isn't available */}

            <img
              src="./Clean-apge-logo-2.png"
              alt=""
              className="w-[60px]   flex items-center justify-center text-white font-bold text-xl"
            />

            <h1 className="text-xl font-sm text-[#0db5f7]">Clean Page Laundry</h1>
          </a>
          <div className='flex flex-row-1 items-center'>
            {/* Desktop Nav */}
            <nav className="hidden md:block mr-10">
              <ul className="flex space-x-8">
                {['Home', 'About Us', 'Our Services', 'Our Impacts', 'Contact'].map((item) => (
                  <li key={item}>
                    <a
                      href={`#${item.toLowerCase().replace(' ', '-')}`}
                      className="text-[#0db5f7] hover:text-red-600 transition-colors font-medium text-sm uppercase tracking-wide"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* WhatsApp Button (Desktop) */}
            <a
              href="https://wa.me/254705588354"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center bg-[#0db5f7] hover:bg-[#128C7E] text-white px-5 py-2.5 rounded-sm transition-all shadow-md"
            >
              <i className="bi bi-whatsapp mr-1"></i> WhatsApp
            </a>
            <a href={ROUTES.login}
              className="ml-8 hidden md:inline-flex items-center bg-[#0db5f7] hover:bg-[#128C7E] text-white px-5 py-2.5 rounded-sm transition-all shadow-md"
            >
              <i className="bi bi-box-arrow-in-right mr-2 text-[20px]"></i>Login
            </a>
          </div>


          {/* Mobile Toggle */}
          <button
            className="md:hidden text-2xl text-gray-800 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 shadow-lg absolute w-full">
            <ul className="space-y-4">
              {['Home', 'About Us', 'Our Services', 'Our Impacts', 'Contact'].map((item) => (
                <li key={item}>
                  <a
                    href={`#${item.toLowerCase().replace(' ', '-')}`}
                    className="block text-gray-600 hover:text-[#0db5f7] font-medium text-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item}
                  </a>
                </li>
              ))}
              <li>
                <a href="https://wa.me/254705588354" className="block text-center bg-[#0db5f7] text-white py-3 rounded-lg font-bold">
                  WhatsApp Us
                </a>
              </li>
            </ul>
          </div>
        )}
      </header>

      <main className="main pt-20">
        {/* --- HERO SECTION --- */}
        <section id="hero" className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img
              src="./beautiful-composition-spa-bath-concept.jpg"
              alt="Background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 z-10"></div>
          </div>

          {/* Content */}
          <div className="container mx-auto px-4 relative z-20 text-center">
            <div className="max-w-4xl mx-auto">
              <h1
                className={`text-4xl md:text-6xl font-bold text-white mb-6 transition-opacity duration-1500 ${isTextVisible ? 'opacity-100' : 'opacity-0'}`}
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                {heroSlides[currentSlide].heading}
              </h1>
              <p
                className={`text-xl md:text-2xl text-gray-200 mb-10 transition-opacity duration-1000 delay-100 ${isTextVisible ? 'opacity-100' : 'opacity-0'}`}
              >
                {heroSlides[currentSlide].subtext}
              </p>
            </div>
            <div className="mt-8">
              <a
                href="https://wa.me/254705588354"
                className="inline-block bg-[#0db5f7] hover:bg-[#0ba3e0] text-white font-bold py-4 px-10 rounded-full transition-all transform hover:scale-105 shadow-lg"
              >
                Book Your Laundry Order Now!
              </a>
            </div>
          </div>
        </section>

        {/* --- ABOUT SECTION --- */}
        <section id="about" className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              {/* Image */}
              <div className="w-full lg:w-1/2">
                <img
                  src="./view-inside-laundromat-room-with-vintage-decor-washing-machines.jpeg"
                  alt="Laundry Interior"
                  className="rounded-2xl shadow-2xl w-full object-cover h-[400px]"
                />
              </div>
              {/* Text */}
              <div className="w-full lg:w-1/2">
                <h2 className="text-4xl font-bold mb-6 text-[#157604]">ABOUT US</h2>
                <p className="text-lg leading-relaxed text-gray-600 font-serif">
                  At Clean Page Laundry, we believe fresh, impeccably clean clothes inspire confidence and comfort. For years, families and professionals have trusted us for quality, care, and perfection in every garment. Using gentle expertise and modern technology, we deliver freshness, elegance, and a personal touch to everything we clean.
                  <br /><br />
                  Beyond laundry, we provide carpet washing, sofa set cleaning, mattress deep cleaning, and shoe cleaning, restoring hygiene and lasting comfort to your home and wardrobe.
                  <br /><br />
                  <span className="font-bold text-[#0db5f7]">Clean Page Laundry & Dry Cleaning Services</span> — where care, cleanliness, and quality meet.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- SERVICES SECTION 1 --- */}
        <section id="services" className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
              <p className="text-gray-500">Comprehensive laundry solutions tailored to your needs, delivered with care and precision</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Service Card Component */}
              {[
                {
                  title: "Carpets Cleaning",
                  desc: "Professional carpet washing that removes dirt, stains, and odors—fresh and fast-drying.",
                  img: "./closeup-vacuum-cleaner-living-room.jpg"
                },
                {
                  title: "Sofa Set Cleaning",
                  desc: "Deep cleaning that restores your sofa’s look, removing dust, stains, and grime.",
                  img: "./sofasetcleaning2.jpg"
                },
                {
                  title: "Mattress Deep Cleaning",
                  desc: "Thorough mattress washing to eliminate stains, odors, and allergens for healthier sleep.",
                  img: "./matresscleaning03.jpeg"
                }
              ].map((service, idx) => (
                <div key={idx} className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden h-[450px] mx-auto w-full max-w-[95%]">
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-[#0db5f7] z-0 h-0 group-hover:h-full transition-all duration-500 ease-in-out"></div>

                  {/* Image */}
                  <div className="relative z-10 h-[300x] overflow-hidden rounded-t-2xl">
                    <img
                      src={service.img}
                      alt={service.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 p-6 flex flex-col justify-between h-[230px] transition-colors duration-300">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-2">{service.title}</h3>
                      <p className="text-sm text-gray-600 group-hover:text-gray-100 leading-relaxed mb-4">
                        {service.desc}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="w-full h-[1px] bg-gray-300 group-hover:bg-white transition-colors"></div>
                      <a href="#" className="text-sm font-bold text-[#c85c0a] group-hover:text-white transition-colors inline-flex items-center gap-1">
                        Order Now →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SERVICES SECTION 2 (More Services) --- */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Shoes Cleaning",
                  desc: "Expert shoe cleaning that brings back freshness, brightness, and style.",
                  img: "./shoescleaning.png"
                },
                {
                  title: "Fast Drying for Sofas & Mattress",
                  desc: "Quick-dry technology so that your furniture is ready to use as soon as possible.",
                  img: "./man-servant-cleaning-house.jpg"
                },
                {
                  title: "Clothes Washing ",
                  desc: "Neat, fresh, and well-washed clothes with care.",
                  img: "./washing.jpeg"
                }
              ].map((service, idx) => (
                <div key={idx} className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden h-[450px] mx-auto w-full max-w-[95%]">
                  <div className="absolute inset-0 bg-[#0db5f7] z-0 h-0 group-hover:h-full transition-all duration-500 ease-in-out"></div>

                  <div className="relative z-10 h-[220px] overflow-hidden rounded-t-2xl">
                    <img
                      src={service.img}
                      alt={service.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>

                  <div className="relative z-10 p-6 flex flex-col justify-between h-[230px]">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-2">{service.title}</h3>
                      <p className="text-sm text-gray-600 group-hover:text-gray-100 leading-relaxed mb-4">
                        {service.desc}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="w-full h-[1px] bg-gray-300 group-hover:bg-white transition-colors"></div>
                      <a href="#" className="text-sm font-bold text-[#c85c0a] group-hover:text-white transition-colors inline-flex items-center gap-1">
                        Order Now →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* --- SERVICES SECTION 3 (More Services) --- */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Dry Cleaning service",
                  desc: "Expert cleaning that brings back freshness, brightness, and style.",
                  img: "./drycleaningimg.png"
                },
                {
                  title: "Ironing",
                  desc: "Quick-drying and proper ironing ready to use as soon as possible.",
                  img: "./ironing.jpg"
                },
                {
                  title: "Clothes Folding",
                  desc: "Neat, fresh, and well-folded clothes with care.",
                  img: "./Folding.jpg"
                }
              ].map((service, idx) => (
                <div key={idx} className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden h-[450px] mx-auto w-full max-w-[95%]">
                  <div className="absolute inset-0 bg-[#0db5f7] z-0 h-0 group-hover:h-full transition-all duration-500 ease-in-out"></div>

                  <div className="relative z-10 h-[220px] overflow-hidden rounded-t-2xl">
                    <img
                      src={service.img}
                      alt={service.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>

                  <div className="relative z-10 p-6 flex flex-col justify-between h-[230px]">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-2">{service.title}</h3>
                      <p className="text-sm text-gray-600 group-hover:text-gray-100 leading-relaxed mb-4">
                        {service.desc}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="w-full h-[1px] bg-gray-300 group-hover:bg-white transition-colors"></div>
                      <a href="#" className="text-sm font-bold text-[#c85c0a] group-hover:text-white transition-colors inline-flex items-center gap-1">
                        Order Now →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* --- TESTIMONIALS / PORTFOLIO (Before & After) --- */}
        <section id="portfolio" className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900">Testimonials</h2>
              {/* <p className="text-xl font-bold text-[#0db5f7] mt-2">Before & After Cleaning</p> */}
            </div>

            <div className="relative max-w-[1200px] mx-auto overflow-hidden">
              {/* Carousel Wrapper */}
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${testimonialIndex * 100}%)` }}
              >
                {testimonials.map((t, i) => (
                  <div key={i} className="min-w-full px-4">
                    <div className="flex flex-col md:flex-row items-center gap-8 bg-white p-6 rounded-2xl shadow-sm relative">

                      {/* Before/After Images */}
                      <div className="w-full md:w-1/2 flex gap-4 h-[400px]">
                        <div className="flex-1 relative rounded-xl overflow-hidden">
                          <img src={t.beforeImg} alt="Before" className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">Before</div>
                        </div>
                        <div className="flex-1 relative rounded-xl overflow-hidden">
                          <img src={t.afterImg} alt="After" className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">After</div>
                        </div>
                      </div>

                      {/* Text Content */}
                      <div className="w-full md:w-1/2 flex flex-col justify-center md:pr-20">
                        <h4 className="text-2xl font-bold text-gray-900 font-serif mb-4">{t.title}</h4>
                        <p className="text-gray-600 text-sm leading-relaxed mb-4">
                          {t.desc}
                        </p>
                        <ul className="text-sm text-gray-500 list-disc pl-5 space-y-1">
                          {/* Specific details from original JS */}
                          {i === 0 && <><li>Sneaker Cleaning</li><li>Leather Polishing</li><li>Stain Removal</li></>}
                          {i === 1 && <><li>Stain Removal</li><li>Steam Pressing</li><li>Folding</li></>}
                          {i === 2 && <><li>Dust Mite Removal</li><li>Odor Elimination</li><li>Drying</li></>}
                        </ul>
                      </div>

                      {/* Circle Image (Absolute) */}

                    </div>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div className="text-center mt-8">
                <button
                  onClick={() => setTestimonialIndex((prev) => (prev + 1) % testimonials.length)}
                  className="bg-[#0db5f7] hover:bg-[#0ba3e0] text-white px-6 py-3 rounded-full font-bold shadow-md transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* --- CONTACT SECTION --- */}
        <section id="contact" className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-[#157604]">Contact</h2>
              <p className="text-xl font-medium text-gray-500">Contact Us</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Map & Info */}
              <div className="space-y-8">
                <div className="h-[300px] w-full bg-gray-200 rounded-xl overflow-hidden shadow-md">
                  {/* UPDATED MAP: Kahawa West, Nairobi */}
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.0983895835917!2d36.924776614753516!3d-1.2010039990715866!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f10f5d8646535%3A0xc27e427613741d68!2sKahawa%20West%2C%20Nairobi!5e0!3m2!1sen!2ske!4v1689195336622!5m2!1sen!2ske"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    title="Map"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0db5f7] text-xl shrink-0">
                      <i className="bi bi-geo-alt-fill"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Address</h3>
                      <p className="text-gray-600"> Kahawa West Opposite Jacaranda Police Station, Nairobi</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0db5f7] text-xl shrink-0">
                      <i className="bi bi-telephone-fill"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Call Us</h3>
                      <p className="text-gray-600">+254 705 588 354</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0db5f7] text-xl shrink-0">
                      <i className="bi bi-envelope-fill"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Email Us</h3>
                      <p className="text-gray-600">cleanpageltd@gmail.com</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="bg-gray-50 p-8 rounded-2xl shadow-sm">
                {formSubmitted && (
                  <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg flex items-center gap-2 animate-bounce">
                    <i className="bi bi-check-circle-fill"></i>
                    <span>Message sent successfully! We will contact you shortly.</span>
                  </div>
                )}
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input
                      type="text"
                      placeholder="Your Name"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0db5f7] focus:ring-1 focus:ring-[#0db5f7] outline-none transition-all"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Your Email"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0db5f7] focus:ring-1 focus:ring-[#0db5f7] outline-none transition-all"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Subject"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0db5f7] focus:ring-1 focus:ring-[#0db5f7] outline-none transition-all"
                    required
                  />
                  <textarea
                    rows={5}
                    placeholder="Your Message"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0db5f7] focus:ring-1 focus:ring-[#0db5f7] outline-none transition-all resize-none"
                    required
                  ></textarea>
                  <button
                    type="submit"
                    className="w-full bg-[#0db5f7] hover:bg-[#0ba3e0] text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg transform active:scale-95"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* --- UPDATED FOOTER --- */}
      <footer className="bg-[#0f172a] text-slate-300 pt-16 pb-8 font-sans">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

            {/* Brand Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <img
                  src="./Clean-apge-logo-2.png"
                  alt="Clean Page Logo"
                  className='w-[60px] h-[60px] object-contain bg-white rounded-full p-1'
                />
                <span className="text-2xl font-bold text-white tracking-tight">Clean Page Laundry</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-sm">
                We provide premium laundry services with a focus on hygiene, speed, and garment care. Serving Nairobi with dedication and excellence.
              </p>
              <div className="flex space-x-4">
                {['facebook', 'twitter', 'instagram', 'linkedin'].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-[#0db5f7] hover:bg-[#0db5f7] hover:text-white transition-all duration-300"
                  >
                    <i className={`bi bi-${social} text-lg`}></i>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-bold text-lg mb-6 relative pb-2 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-12 after:h-1 after:bg-[#0db5f7]">
                Quick Links
              </h4>
              <ul className="space-y-3">
                {['Home', 'About Us', 'Our Services', 'Impacts', 'Contact'].map((link) => (
                  <li key={link}>
                    <a
                      href={`#${link.toLowerCase().replace(' ', '-')}`}
                      className="hover:text-[#0db5f7] transition-colors flex items-center gap-2 group"
                    >
                      <i className="bi bi-chevron-right text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-white font-bold text-lg mb-6 relative pb-2 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-12 after:h-1 after:bg-[#0db5f7]">
                Services
              </h4>
              <ul className="space-y-3">
                {['Wash & Fold', 'Dry Cleaning', 'Carpet Cleaning', 'Sofa & Mattress', 'Shoe Cleaning'].map((service) => (
                  <li key={service}>
                    <a href="#" className="hover:text-[#0db5f7] transition-colors flex items-center gap-2 group">
                      <i className="bi bi-chevron-right text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
                      {service}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h4 className="text-white font-bold text-lg mb-4">Get In Touch</h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <i className="bi bi-geo-alt text-[#0db5f7] mt-1"></i>
                  <span className="text-slate-300">Kahawa West Opposite Jacaranda Police Station, Nairobi</span>
                </li>
                <li className="flex items-center gap-3">
                  <i className="bi bi-telephone text-[#0db5f7]"></i>
                  <span className="text-slate-300">+254 705 588 354</span>
                </li>
                <li className="flex items-center gap-3">
                  <i className="bi bi-envelope text-[#0db5f7]"></i>
                  <span className="text-slate-300">cleanpageltd@gmail.com</span>
                </li>
              </ul>
              <div className="mt-6">
                <a href="https://wa.me/254705588354" className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-2.5 rounded-lg font-medium transition-colors">
                  <i className="bi bi-whatsapp text-lg"></i> Chat on WhatsApp
                </a>
              </div>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} <span className="text-[#0db5f7] font-semibold">Clean Page Laundry</span>. All Rights Reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* --- SCROLL TO TOP --- */}
      <a
        href="#"
        className="fixed bottom-6 right-6 w-12 h-12 bg-[#0db5f7] text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-40 hover:-translate-y-1 transition-transform"
        style={{ display: 'var(--scroll-display, none)', opacity: 'var(--scroll-opacity, 0)' }}
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        ↑
      </a>
    </div>
  );
}
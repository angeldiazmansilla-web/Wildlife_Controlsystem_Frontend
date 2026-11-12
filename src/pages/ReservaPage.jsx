import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const service = location.state?.servicio; // Kept 'servicio' if that's how it comes from the catalog

  // If someone enters this URL without choosing a tour, send them back to the catalog
  useEffect(() => {
    if (!service) navigate('/catalogo');
  }, [service, navigate]);

  // Minimum date calculation (Today + 30 days)
  const minTravelDate = new Date();
  minTravelDate.setDate(minTravelDate.getDate() + 30);
  const minDateString = minTravelDate.toISOString().split('T')[0];

  // General trip state
  const [tripData, setTripData] = useState({
    travel_date: '',
    pickup_point: ''
  });

  // Dynamic state for passengers (Starts with 1 main passenger)
  const [passengers, setPassengers] = useState([
    { id: 1, name: '', phone: '', email: '', diet: '', nationality: '', birth_date: '', document_id: '', document_file: null }
  ]);

  const addPassenger = () => {
    const newId = passengers.length + 1;
    setPassengers([...passengers, { id: newId, name: '', phone: '', email: '', diet: '', nationality: '', birth_date: '', document_id: '', document_file: null }]);
  };

  const removePassenger = (id) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter(p => p.id !== id));
    }
  };

  const handlePassengerChange = (id, field, value) => {
    const newPassengers = passengers.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    );
    setPassengers(newPassengers);
  };

  const submitForm = async (e) => {
    e.preventDefault();

    // 1. Calculate age from main passenger's birthdate
    const mainPassenger = passengers[0];
    const today = new Date();
    const birthDate = new Date(mainPassenger.birth_date);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }

    // 2. Calculate estimated total cost
    const paxCount = passengers.length;
    let estimatedCost = 0;
    if (paxCount <= 2) estimatedCost = service.precios.pax2;
    else if (paxCount <= 4) estimatedCost = service.precios.pax4;
    else estimatedCost = service.precios.pax10;

    // 3. Build JSON (Payload) with exact Backend structure
    const payload = new FormData();

    // Booking data (Keys must remain in Spanish for Django)
    payload.append('fecha_viaje', tripData.travel_date);
    payload.append('punto_pickup', tripData.pickup_point);
    payload.append('destino', service.titulo);
    payload.append('cantidad_pasajeros', paxCount);
    payload.append('costo_total', estimatedCost);
    payload.append('tipo_servicio', service.categoria);

    // Main customer data
    payload.append('nombre', mainPassenger.name);
    payload.append('rut', mainPassenger.document_id);
    payload.append('telefono', mainPassenger.phone);
    payload.append('email', mainPassenger.email);
    payload.append('dieta', mainPassenger.diet || 'None');
    payload.append('nacionalidad', mainPassenger.nationality);
    payload.append('edad', calculatedAge);
    payload.append('origen', 'Directo');

    // Capture actual file
    if (mainPassenger.document_file) {
      payload.append('foto_documento', mainPassenger.document_file);
    }

    // 4. Send data to Django
    try {
      const response = await fetch('https://both-smirk-entrust.ngrok-free.dev/api/clientes/nuevo/', {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        },
        method: 'POST',
        body: payload
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Registration saved successfully!\nAssigned ID: ${data.id}`);
        navigate('/catalogo');
      } else {
        const errorData = await response.json();
        console.error("Django validation errors:", errorData);
        alert('Error saving to database. Check the console for details.');
      }
    } catch (error) {
      console.error("Network error:", error);
      alert('Connection error. Make sure the Django server is running.');
    }
  };

  if (!service) return null;

  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh', color: '#ffffff', paddingBottom: '80px' }}>

      {/* Checkout Header */}
      <div className="py-4" style={{ backgroundColor: '#111111', borderBottom: '1px solid #333' }}>
        <div className="container d-flex align-items-center">
          <button onClick={() => navigate(-1)} className="btn btn-outline-light me-4 rounded-circle"><i className="bi bi-arrow-left"></i></button>
          <div>
            <h2 className="mb-0 fw-bold" style={{ color: 'var(--tp-gold)' }}>Complete Booking</h2>
            <p className="mb-0 text-muted">You are one step away from your Patagonia adventure</p>
          </div>
        </div>
      </div>

      <div className="container py-5">
        <form onSubmit={submitForm}>
          <div className="row g-5">

            {/* LEFT COLUMN: FORMS */}
            <div className="col-lg-7">

              {/* Block 1: Logistics Data (Dates and Pickup) */}
              <div className="p-4 mb-4 shadow-sm" style={{ backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>
                <h4 className="fw-bold mb-4 border-bottom border-secondary pb-2"><i className="bi bi-geo-alt me-2" style={{ color: 'var(--tp-gold)' }}></i>Trip Logistics</h4>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label text-white fw-semibold">Trip Date <span className="text-muted fw-normal">(Min. 30 days)</span></label>
                    <input type="date" className="form-control border-secondary text-white" style={{ backgroundColor: '#2d2d2d' }}
                      min={minDateString}
                      value={tripData.travel_date}
                      onChange={(e) => setTripData({ ...tripData, travel_date: e.target.value })} required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-white fw-semibold">Pick-up Point</label>
                    <input type="text" className="form-control border-secondary text-white" style={{ backgroundColor: '#2d2d2d' }}
                      placeholder="e.g., Hotel Costaustralis..."
                      value={tripData.pickup_point}
                      onChange={(e) => setTripData({ ...tripData, pickup_point: e.target.value })} required
                    />
                  </div>
                </div>
              </div>

              {/* Block 2: Dynamic Passengers */}
              {passengers.map((pax, index) => (
                <div key={pax.id} className="p-4 mb-4 shadow-sm position-relative" style={{ backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>

                  <div className="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary pb-2">
                    <h5 className="fw-bold mb-0 text-white">
                      <i className="bi bi-person-fill me-2" style={{ color: 'var(--tp-gold)' }}></i>
                      {index === 0 ? 'Passenger 1 (Main)' : `Passenger ${index + 1}`}
                    </h5>
                    {index > 0 && (
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removePassenger(pax.id)}>
                        <i className="bi bi-trash"></i> Remove
                      </button>
                    )}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-white fw-semibold">Full Name</label>
                      <input type="text" className="form-control border-secondary text-white" style={{ backgroundColor: '#2d2d2d' }} value={pax.name} onChange={(e) => handlePassengerChange(pax.id, 'name', e.target.value)} required />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-white fw-semibold">Nationality</label>
                      <select
                        className="form-select border-secondary text-white"
                        style={{ backgroundColor: '#2d2d2d' }}
                        value={pax.nationality}
                        onChange={(e) => handlePassengerChange(pax.id, 'nationality', e.target.value)}
                        required>
                        <option value="">Select a nationality...</option>
                        <option value="Argentina">Argentina</option>
                        <option value="Bolivia">Bolivia</option>
                        <option value="Brasil">Brazil</option>
                        <option value="Chile">Chile</option>
                        <option value="Colombia">Colombia</option>
                        <option value="Ecuador">Ecuador</option>
                        <option value="España">Spain</option>
                        <option value="México">Mexico</option>
                        <option value="Perú">Peru</option>
                        <option value="Uruguay">Uruguay</option>
                        <option value="Venezuela">Venezuela</option>
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Only ask for Phone and Email from the Main Passenger to avoid redundancy */}
                    {index === 0 && (
                      <>
                        <div className="col-md-6">
                          <label className="form-label text-white fw-semibold">Email Address</label>
                          <input type="email" className="form-control border-secondary text-white" style={{ backgroundColor: '#2d2d2d' }} value={pax.email} onChange={(e) => handlePassengerChange(pax.id, 'email', e.target.value)} required />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-white fw-semibold">Phone / WhatsApp</label>
                          <input type="tel" className="form-control border-secondary text-white" style={{ backgroundColor: '#2d2d2d' }} value={pax.phone} onChange={(e) => handlePassengerChange(pax.id, 'phone', e.target.value)} required />
                        </div>
                      </>
                    )}

                    <div className="col-md-6">
                      <label className="form-label text-white fw-semibold">Date of Birth</label>
                      <input type="date" className="form-control border-secondary text-white" style={{ backgroundColor: '#2d2d2d' }} value={pax.birth_date} onChange={(e) => handlePassengerChange(pax.id, 'birth_date', e.target.value)} required />
                    </div>

                    {/* Document / Passport */}
                    <div className="col-md-6">
                      <label className="form-label text-white fw-semibold">Document / Passport</label>
                      <input
                        type="text"
                        className="form-control border-secondary text-white"
                        style={{ backgroundColor: '#2d2d2d' }}
                        value={pax.document_id}
                        onChange={(e) => handlePassengerChange(pax.id, 'document_id', e.target.value)}
                        placeholder="e.g., 12.345.678-9 or Passport A1234567"
                        required
                      />
                    </div>

                    {/* INPUT TO UPLOAD DOCUMENT PHOTO */}
                    <div className="col-12 mt-2">
                      <label className="form-label text-white fw-semibold">Document Photo</label>
                      <input 
                        type="file" 
                        className="form-control border-secondary text-white bg-dark" 
                        style={{ backgroundColor: '#2d2d2d' }} 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          handlePassengerChange(pax.id, 'document_file', file);
                        }} 
                        required 
                      />
                      <div className="form-text" style={{ fontSize: '0.8rem', color: '#aaaaaa' }}>
                        Upload a clear photo of your document (JPG, PNG).
                      </div>
                    </div>

                  </div> {/* Close row g-3 */}
                </div> /* Close passenger card */
              ))}

              <button type="button" onClick={addPassenger} className="btn btn-outline-light w-100 py-3 rounded-3 border-dashed mt-2" style={{ borderStyle: 'dashed' }}>
                <i className="bi bi-plus-circle me-2"></i> Add another passenger
              </button>

            </div>

            {/* RIGHT COLUMN: SUMMARY AND MAP */}
            <div className="col-lg-5">
              <div className="position-sticky" style={{ top: '20px' }}>

                {/* Service Summary Card */}
                <div className="card bg-dark border-secondary shadow-lg mb-4">
                  <img src={service.img || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80"} className="card-img-top" alt="Tour" style={{ height: '200px', objectFit: 'cover' }} />
                  <div className="card-body p-4">
                    <span className="badge mb-2" style={{ backgroundColor: 'var(--tp-green)' }}>{service.categoria}</span>
                    <h4 className="card-title text-white fw-bold">{service.titulo}</h4>
                    <p className="card-text text-light" style={{ opacity: 0.8, fontSize: '0.9rem' }}>{service.descripcion}</p>

                    <hr className="border-secondary" />
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-white">Number of Passengers:</span>
                      <span className="fw-bold fs-5 text-white">{passengers.length} Pax</span>
                    </div>
                    {/* Simple price logic based on quantity */}
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-white">Estimated Price (USD):</span>
                      <span className="fw-bold fs-3" style={{ color: 'var(--tp-gold)' }}>
                        ${passengers.length <= 2 ? service.precios.pax2 : (passengers.length <= 4 ? service.precios.pax4 : service.precios.pax10)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Embedded Map */}
                <div className="card bg-dark border-secondary shadow-lg mb-4">
                  <div className="card-header border-secondary bg-transparent py-3">
                    <h6 className="mb-0 text-white fw-bold"><i className="bi bi-map me-2" style={{ color: 'var(--tp-gold)' }}></i>Location Reference</h6>
                  </div>
                  <div className="card-body p-0">
                    <iframe
                      title="Patagonia Map"
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d143169.61058226068!2d-72.63004381273934!3d-51.72899478440078!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xbdb2630062a4d95b%3A0xcda8d01150495d43!2sPuerto%20Natales%2C%20Natales%2C%20Magallanes%20y%20la%20Ant%C3%A1rtica%20Chilena!5e0!3m2!1ses!2scl!4v1700000000000!5m2!1ses!2scl"
                      width="100%"
                      height="250"
                      style={{ border: 0, borderBottomLeftRadius: 'calc(.25rem - 1px)', borderBottomRightRadius: 'calc(.25rem - 1px)' }}
                      allowFullScreen=""
                      loading="lazy">
                    </iframe>
                  </div>
                </div>

                <button type="submit" className="btn btn-gold w-100 py-3 fw-bold fs-5 shadow">
                  Confirm Booking
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingPage;

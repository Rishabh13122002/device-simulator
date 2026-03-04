import React, { useState, useRef, useEffect } from "react";

const deviceOptions = {
  "FLOW METER": [
    "FM-4G",
    "FM25-4G",
    "BATTERY-OPERATED",
    "PADDLE-TYPE",
    "CONVENTIONAL",
    "FM",
  ],
  BRWHMS: [
    "brwhms-oc-4",
    "brwhms-oc-3",
    "brwhms-oc-2",
    "brwhms-oc",
    "SELAM-HIH",
  ],
  BTLM: ["btlm-c", "btlm-1", "btlm"],
  DWLR: ["DWLR-TG", "DWLR-TB"],
  BFEWS: ["bfews-1", "bfews"],
};

const extraFieldsByType = {
  DWLR: [
    { name: "cable_length", label: "Cable Length" },
    { name: "ambient_pressure", label: "Ambient Pressure" },
    { name: "ambient_temperature", label: "Ambient Temperature" },
    { name: "temperature_min", label: "Temperature Min" },
    { name: "temperature_max", label: "Temperature Max" },
    { name: "water_pressure_min", label: "Water Pressure Min" },
    { name: "water_pressure_max", label: "Water Pressure Max" },
    { name: "mvc_min", label: "MVC Min" },
    { name: "mvc_max", label: "MVC Max" },
    { name: "serial", label: "Serial" },
    { name: "mobile", label: "Mobile" },
    { name: "sensor_voltage", label: "Sensor Voltage" },
    { name: "battery_voltage", label: "Battery Voltage" },
    { name: "shift_start", label: "Shift Start Time", type: "datetime-local" },
    { name: "shift_end", label: "Shift End Time", type: "datetime-local" },
  ],
  "FLOW METER": [
    { name: "flow_min", label: "Flow Min" },
    { name: "flow_max", label: "Flow Max" },
    { name: "lpm", label: "LPM" },
    { name: "totalizer", label: "Totalizer" },
    { name: "shift_start", label: "Shift Start Time", type: "datetime-local" },
    { name: "shift_end", label: "Shift End Time", type: "datetime-local" },
  ],
  BRWHMS: [
    { name: "height", label: "Height" },
    { name: "height_min", label: "Height Min" },
    { name: "height_max", label: "Height Max" },
    { name: "A", label: " Constant A" },
    { name: "B", label: "Constant B" },
    { name: "totalizer", label: "Totalizer" },
    { name: "shift_start", label: "Shift Start Time", type: "datetime-local" },
    { name: "shift_end", label: "Shift End Time", type: "datetime-local" },
  ],
  BTLM: [
    { name: "height_min", label: "Height Min" },
    { name: "height_max", label: "Height Max" },
    { name: "shift_start", label: "Shift Start Time", type: "datetime-local" },
    { name: "shift_end", label: "Shift End Time", type: "datetime-local" },
  ],
  BFEWS: [
    { name: "height", label: "Height" },
    { name: "height_min", label: "Height Min" },
    { name: "height_max", label: "Height Max" },
    { name: "temperature", label: "Temperature" },
    { name: "temperature_min", label: "Temperature Min" },
    { name: "temperature_max", label: "Temperature Max" },
    { name: "shift_start", label: "Shift Start Time", type: "datetime-local" },
    { name: "shift_end", label: "Shift End Time", type: "datetime-local" },
  ],
};

function DeviceSimulator() {
  const [formData, setFormData] = useState({
    device_type: "",
    device_id: "",
    imei: "",
    randomness_percentage: "",
    frequency: "",
  });
  const intervalRef = useRef(null);
  const [output, setOutput] = useState(null);
  const [runningDevices, setRunningDevices] = useState({});
  const url = "https://node-red-flows-production-d273.up.railway.app";
  const validateForm = () => {
    // 1️⃣ Check empty fields
    for (let key in formData) {
      if (!formData[key] || formData[key].toString().trim() === "") {
        alert(`${key} is required`);
        return false;
      }
    }
    // 2️⃣ IMEI validation
    const imeiRegex = /^\d{15}$/;
    if (!imeiRegex.test(formData.imei)) {
      alert("IMEI must be exactly 15 digits");
      return false;
    }
    return true;
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "device_type") {
      setFormData({
        device_type: value,
        device_id: "",
        imei: "",
        randomness_percentage: "",
        frequency: "",
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStart = async () => {
    if (!validateForm()) {
      return;
    }
    try {
      await fetch(`${url}/start-simulation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      // Clear old polling if exists
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Start polling live data
      intervalRef.current = setInterval(
        async () => {
          try {
            const res = await fetch(
              `${url}/get-simulation/${formData.imei}`,
            );
            const data = await res.json();
            console.log(data);
            if (data && Object.keys(data).length > 0) {
              setOutput({ ...data });
            }
          } catch (err) {
            console.error("Polling error:", err);
          }
        },
        formData.frequency * 60 * 1000,
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${url}/stop-simulation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imei: formData.imei }),
      });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      setOutput(null);
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${url}/get-running-devices`);
        const data = await res.json();
        setRunningDevices(data);
      } catch (err) {
        console.log("Running devices fetch error");
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);
  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>Device Simulator - Configuration Setup</h2>

        {/* Device Type */}
        <select
          name="device_type"
          value={formData.device_type}
          onChange={handleChange}
          style={styles.input}
        >
          <option value="">Select Device Type</option>
          {Object.keys(deviceOptions).map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>

        {/* Device ID */}
        {formData.device_type && (
          <select
            name="device_id"
            value={formData.device_id}
            onChange={handleChange}
            style={styles.input}
          >
            <option value="">Select Device ID</option>
            {deviceOptions[formData.device_type].map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        )}

        {/* Common Fields */}
        {formData.device_type && (
          <>
            <div style={styles.fieldRow}>
              <label style={styles.label}>IMEI:</label>
              <input
                name="imei"
                placeholder="IMEI"
                maxLength="15"
                value={formData.imei}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div style={styles.fieldRow}>
              <label style={styles.label}>Randomness Percentage:</label>
              <input
                type="number"
                name="randomness_percentage"
                placeholder="Randomness (%)"
                value={formData.randomness_percentage}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
            <div style={styles.fieldRow}>
              <label style={styles.label}>Frequency (minutes):</label>
              <input
                type="number"
                name="frequency"
                placeholder="Frequency"
                value={formData.frequency}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </>
        )}

        {/* Dynamic Extra Fields */}
        {formData.device_type &&
          extraFieldsByType[formData.device_type]?.map((field) => (
            <div key={field.name} style={styles.fieldRow}>
              <label style={styles.label}>{field.label}:</label>
              <input
                key={field.name}
                type={field.type || "number"}
                name={field.name}
                placeholder={field.label}
                value={formData[field.name] || ""}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          ))}

        <div style={styles.buttonGroup}>
          <button onClick={handleStart} style={styles.startBtn}>
            Start
          </button>
          <button onClick={handleStop} style={styles.stopBtn}>
            Stop
          </button>
        </div>
        <h3>Currently Running Devices</h3>

        {Object.keys(runningDevices).length === 0 && <p>No devices running</p>}

        {Object.entries(runningDevices).map(([imei, device]) => (
          <div key={imei}>
            <strong>IMEI:</strong> {imei}
            <strong> Device:</strong> {device.deviceType}
          </div>
        ))}
        {output && (
          <div style={styles.outputBox}>
            <h4>Live Device Data</h4>

            {formData.device_type === "DWLR" && (
              <>
                <p>
                  <strong>Water Column:</strong> {output.water_column}
                </p>
                <p>
                  <strong>Water Column From Ground:</strong>{" "}
                  {output.water_column_from_ground}
                </p>
                <p>
                  <strong>Water Temperature:</strong> {output.water_temperature}{" "}
                  °C
                </p>
                <p>
                  <strong>Water Pressure:</strong> {output.water_pressure} bar
                </p>
                <p>
                  <strong>Battery Voltage:</strong> {output.battery_voltage} V
                </p>
              </>
            )}

            {formData.device_type === "FLOW METER" && (
              <>
                <p>
                  <strong>LPM:</strong> {output.lpm}
                </p>
                <p>
                  <strong>Totalizer:</strong> {output.total}
                </p>
              </>
            )}

            {formData.device_type === "BRWHMS" && (
              <>
                <p>
                  <strong>Hcal:</strong> {output[0]}
                </p>
                <p>
                  <strong>Flow:</strong> {output[1]}
                </p>
                <p>
                  <strong>Totalizer:</strong> {output[2]}
                </p>
              </>
            )}

            {formData.device_type === "BTLM" && (
              <>
                <p>
                  <strong>Height:</strong> {output.Height}
                </p>
                <p>
                  <strong>Date:</strong> {output.date}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #1e3c72, #2a5298)",
  },
  card: {
    width: "550px",
    padding: "35px",
    borderRadius: "15px",
    background: "white",
    boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  title: {
    textAlign: "center",
    marginBottom: "10px",
  },
  input: {
    padding: "12px",
    fontSize: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  buttonGroup: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "15px",
  },
  startBtn: {
    flex: 1,
    marginRight: "10px",
    padding: "12px",
    background: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
  },
  stopBtn: {
    flex: 1,
    padding: "12px",
    background: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
  },
  outputBox: {
    marginTop: "20px",
    backgroundColor: "#f1f3f5",
    padding: "15px",
    borderRadius: "8px",
  },
  fieldRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  label: {
    minWidth: "180px",
    fontWeight: "500",
  },
};

export default DeviceSimulator;

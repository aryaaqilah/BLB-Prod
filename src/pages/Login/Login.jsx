import { useState, useEffect } from "react";
import PrimaryLogoLight from "../../assets/Logo/Logo_Primary_Dark.png";
import { FaUser, FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const ValidationMessage = ({ isValid, message, isTouched }) => {
  if (isTouched && isValid === false) {
    return (
      <p style={{ color: "red", fontSize: "0.8em", marginTop: "5px", marginLeft: "50px" }}>
        {message}
      </p>
    );
  }
  return null;
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isTouched, setIsTouched] = useState({});
  const [validationErrors, setValidationErrors] = useState({ email: false, password: false });
  const [isLoading, setIsLoading] = useState(false);
  const [submitErrorsList, setSubmitErrorsList] = useState([]);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  const validateField = (name, value) => {
    let isValid = true;
    if (name === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      isValid = emailRegex.test(value);
    } else if (name === "password") {
      isValid = value.length >= 1;
    }
    return { isValid };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSubmitErrorsList([]);
    const { isValid } = validateField(name, value);
    setValidationErrors(prev => ({ ...prev, [name]: isValid }));
  };

  const handleInputBlur = (e) => {
    const { name } = e.target;
    setIsTouched(prev => ({ ...prev, [name]: true }));
  };

  useEffect(() => {
    const isFormComplete = Object.values(formData).every(v => v.trim() !== "");
    const allFieldsValid = Object.values(validationErrors).every(v => v === true);
    setIsButtonDisabled(!(isFormComplete && allFieldsValid));
  }, [formData, validationErrors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitErrorsList([]);
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();

      if (response.ok) {
        login(responseData);
        
        if (responseData.userType === "florist") {
          navigate("/dashboard");
        } else {
          navigate("/");
        }
      } else {
        setSubmitErrorsList([responseData.error]);
      }
    } catch (error) {
      setSubmitErrorsList(["Gagal terhubung ke server."]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="LoginSection">
      <form className="LoginForm" onSubmit={handleSubmit} noValidate>
        <img src={PrimaryLogoLight} alt="Logo" className="LoginLogo" />

        {submitErrorsList.length > 0 && (
          <div style={{ padding: "10px", backgroundColor: "#fdd", border: "1px solid red", borderRadius: "5px", marginBottom: "20px", textAlign: "center", color: "red", fontSize: "0.9em" }}>
            {submitErrorsList[0]}
          </div>
        )}

        <div className="LoginInputGroup">
          <div className="LoginInput">
            <FaUser className="LoginIcon" />
            <input type="email" placeholder="Email" className="LoginInputTextfield" name="email" value={formData.email} onChange={handleInputChange} onBlur={handleInputBlur} />
          </div>
          <ValidationMessage isValid={validationErrors.email} message="Format email tidak valid." isTouched={isTouched.email} />

          <div className="LoginInput">
            <FaLock className="LoginIcon" />
            <input type="password" placeholder="******" className="LoginInputTextfield" name="password" value={formData.password} onChange={handleInputChange} onBlur={handleInputBlur} />
          </div>
          <ValidationMessage isValid={validationErrors.password} message="Password harus diisi." isTouched={isTouched.password} />
        </div>

        <div className="AlignCenter">
          <button className="button-primary-fill" type="submit" disabled={isButtonDisabled || isLoading}>
            {isLoading ? "Memproses..." : "Masuk"}
          </button>
          <p className="p1">
            belum punya akun? <a href="/register" className="p1 txt-color-primary">buat akun</a>
          </p>
        </div>
      </form>
    </div>
  );
}
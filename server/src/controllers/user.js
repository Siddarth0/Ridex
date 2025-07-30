import User from "../models/user.js";


const registerUser = async (req, res) => {
  const {email} = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ message: 'User already exists' });

  const user = await User.create(req.body);

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

const getProfile = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  res.json(user);
};

export {registerUser, getProfile}
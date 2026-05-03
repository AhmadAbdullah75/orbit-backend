import fs from 'fs';

// 1. Update authController.js
const authControllerPath = 'c:/Users/alfat/saas-project-manager/project-manager-backend/src/controllers/authController.js';
let authController = fs.readFileSync(authControllerPath, 'utf8');

const updateProfileFunction = `
export const updateProfile = catchAsync(
  async (req, res, next) => {
    const { name } = req.body

    if (!name?.trim()) {
      return next(
        new AppError('Name is required', 400)
      )
    }
    if (name.trim().length < 2 ||
        name.trim().length > 50) {
      return next(
        new AppError(
          'Name must be 2-50 characters', 400
        )
      )
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).select('-password')

    res.status(200).json({
      status: 'success',
      data: { user }
    })
  }
);
`;

if (!authController.includes('export const updateProfile')) {
    authController += updateProfileFunction;
    fs.writeFileSync(authControllerPath, authController);
    console.log('Updated authController.js with updateProfile');
} else {
    console.log('updateProfile already exists in authController.js');
}

// 2. Update authRoutes.js
const authRoutesPath = 'c:/Users/alfat/saas-project-manager/project-manager-backend/src/routes/authRoutes.js';
let authRoutes = fs.readFileSync(authRoutesPath, 'utf8');

// Update imports
if (!authRoutes.includes('updateProfile,')) {
    authRoutes = authRoutes.replace(
        '  logout,\n  getMe,',
        '  logout,\n  getMe,\n  updateProfile,'
    );
}

// Add route
if (!authRoutes.includes("router.patch('/profile'")) {
    authRoutes = authRoutes.replace(
        "router.get('/me', protect, getMe);",
        "router.get('/me', protect, getMe);\nrouter.patch('/profile', protect, updateProfile);"
    );
}

fs.writeFileSync(authRoutesPath, authRoutes);
console.log('Updated authRoutes.js with profile route');

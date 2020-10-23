<?php
$this->breadcrumbs=array(
	'Cours'=>array('index'),
	$model->name=>array('view','id'=>$model->id),
	'mettre à jour',
);

$this->menu=array(
	array('label'=>'List Lesson', 'url'=>array('index')),
	array('label'=>'Create Lesson', 'url'=>array('create')),
	array('label'=>'View Lesson', 'url'=>array('view', 'id'=>$model->id)),
	array('label'=>'Manage Lesson', 'url'=>array('admin')),
);
?>

<h1>Mettre à jour le cours : <?php echo $model->name; ?></h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>
<?php
$this->breadcrumbs=array(
	'Cours'=>array('index'),
	'Créer',
);

$this->menu=array(
	array('label'=>'List Lesson', 'url'=>array('index')),
	array('label'=>'Manage Lesson', 'url'=>array('admin')),
);
?>

<h1>Créer un cours</h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>